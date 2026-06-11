import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FinanceService } from './finance.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('api/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('expenses')
  @Roles('Admin')
  @ApiOperation({ summary: 'Create a new expense record' })
  @ApiResponse({ status: 201, description: 'Expense created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async createExpense(@Body() dto: CreateExpenseDto, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.financeService.createExpense(dto, user);
  }

  @Get('expenses')
  @Roles('Admin')
  @ApiOperation({ summary: 'List expense records with optional filters' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Expense list', type: [Object] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findExpenses(
    @Query('type') type?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.financeService.findExpenses({ type, month, year });
  }

  @Get('expenses/:id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiResponse({ status: 200, description: 'Expense found', type: Object })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findExpenseById(@Param('id') id: string) {
    return this.financeService.findExpenseById(id);
  }

  @Patch('expenses/:id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update expense by ID' })
  @ApiResponse({ status: 200, description: 'Expense updated', type: Object })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.financeService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Delete expense by ID' })
  @ApiResponse({ status: 204, description: 'Expense deleted' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteExpense(@Param('id') id: string) {
    await this.financeService.deleteExpense(id);
  }

  @Get('summary')
  @Roles('Admin')
  @ApiOperation({ summary: 'Generate monthly financial summary for a date range' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Financial summary', type: Object })
  @ApiResponse({ status: 400, description: 'Bad request - invalid dates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getSummary(@Query() query: FinanceSummaryQueryDto) {
    return this.financeService.getSummary(query.startDate, query.endDate);
  }
}
