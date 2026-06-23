import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerNumberUtil } from './utils/customer-number.util';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private customerNumberUtil: CustomerNumberUtil,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const { firstPhone, secondPhone } = createCustomerDto;

    // Check for duplicate firstPhone
    const existingFirstPhone = await this.prisma.customer.findUnique({
      where: { firstPhone },
    });
    if (existingFirstPhone) {
      throw new ConflictException('يوجد عميل بهذا الرقم الأول للهاتف بالفعل');
    }

    // Check for duplicate secondPhone if provided
    if (secondPhone) {
      const existingSecondPhone = await this.prisma.customer.findUnique({
        where: { secondPhone },
      });
      if (existingSecondPhone) {
        throw new ConflictException(
          'يوجد عميل بهذا الرقم الثاني للهاتف بالفعل',
        );
      }
    }

    const customerNumber =
      await this.customerNumberUtil.generateUniqueCustomerNumber();

    return this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        customerNumber,
      },
      include: {
        requests: true,
      },
    });
  }

  async findAll(params: {
    phone?: string;
    name?: string;
    page?: number;
    limit?: number;
  }) {
    const { phone, name, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: {
      isActive: boolean;
      OR?: Array<{
        firstPhone?: { contains: string };
        secondPhone?: { contains: string };
      }>;
      name?: { contains: string };
    } = { isActive: true };

    if (phone) {
      where.OR = [
        { firstPhone: { contains: phone } },
        { secondPhone: { contains: phone } },
      ];
    }

    if (name) {
      where.name = { contains: name };
    }

    const [customers, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        requests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`عميل بالمعرف ${id} غير موجود`);
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    await this.findOne(id);

    const { firstPhone, secondPhone } = updateCustomerDto;

    // Check for duplicate firstPhone if being updated
    if (firstPhone) {
      const existingFirstPhone = await this.prisma.customer.findFirst({
        where: { firstPhone, id: { not: id } },
      });
      if (existingFirstPhone) {
        throw new ConflictException('يوجد عميل بهذا الرقم الأول للهاتف بالفعل');
      }
    }

    // Check for duplicate secondPhone if being updated
    if (secondPhone) {
      const existingSecondPhone = await this.prisma.customer.findFirst({
        where: { secondPhone, id: { not: id } },
      });
      if (existingSecondPhone) {
        throw new ConflictException(
          'يوجد عميل بهذا الرقم الثاني للهاتف بالفعل',
        );
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { requests: true } } },
    });

    if (!customer) {
      throw new NotFoundException(`عميل بالمعرف ${id} غير موجود`);
    }

    if (customer._count.requests > 0) {
      throw new ConflictException('لا يمكن حذف العميل المرتبط بطلبات صيانة');
    }

    await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
