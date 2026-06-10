import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

@ApiTags('requests')
@Controller('api/requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new repair request' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient role privileges',
  })
  async create(
    @Body() createRequestDto: CreateRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requestsService.create(createRequestDto, req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List repair requests with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'scheduledDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Requests list returned' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient role privileges',
  })
  async findAll(@Query() requestQueryDto: RequestQueryDto) {
    return this.requestsService.findAll(requestQueryDto);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get repair request by ID' })
  @ApiResponse({ status: 200, description: 'Request returned' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update repair request' })
  @ApiResponse({ status: 200, description: 'Request updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async update(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateRequestDto,
  ) {
    return this.requestsService.update(id, updateRequestDto);
  }

  @Post(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a technician to a repair request' })
  @ApiResponse({ status: 200, description: 'Technician assigned successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid or inactive technician',
  })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient role privileges',
  })
  async assignTechnician(
    @Param('id') id: string,
    @Body() assignTechnicianDto: AssignTechnicianDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requestsService.assignTechnician(
      id,
      assignTechnicianDto.technicianId,
      req.user.id,
    );
  }

  @Get(':id/status-history')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get status history timeline for a repair request' })
  @ApiResponse({ status: 200, description: 'Status history returned' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient role privileges',
  })
  async getStatusHistory(@Param('id') id: string) {
    return this.requestsService.getStatusHistory(id);
  }
}
