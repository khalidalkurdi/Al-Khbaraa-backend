import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { getSyriaNow } from '../common/utils/syria-date.util';

type TimestampFields = {
  created: Map<string, string[]>;
  updated: Map<string, string[]>;
};

function buildTimestampFields(): TimestampFields {
  const created = new Map<string, string[]>();
  const updated = new Map<string, string[]>();

  for (const model of Prisma.dmmf.datamodel.models) {
    const createdFields = model.fields
      .filter(
        (f) =>
          f.type === 'DateTime' &&
          f.default != null &&
          (f.default as { name?: string }).name === 'now',
      )
      .map((f) => f.name);

    const updatedFields = model.fields
      .filter((f) => f.type === 'DateTime' && f.isUpdatedAt)
      .map((f) => f.name);

    if (createdFields.length) created.set(model.name, createdFields);
    if (updatedFields.length) updated.set(model.name, updatedFields);
  }

  return { created, updated };
}

const TIMESTAMP_FIELDS = buildTimestampFields();

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      transactionOptions: {
        timeout: 50000, // 50 seconds timeout
      },
    });

    const extended = this.$extends({
      query: {
        async $allOperations({ model, operation, args, query }) {
          if (!model) return query(args); // eslint-disable-line @typescript-eslint/no-unsafe-return

          const modelCreated = TIMESTAMP_FIELDS.created.get(model);
          const modelUpdated = TIMESTAMP_FIELDS.updated.get(model);
          const data = (args as { data?: unknown })?.data;

          const apply = (record: unknown, fields?: string[]) => {
            if (
              !record ||
              typeof record !== 'object' ||
              Array.isArray(record)
            ) {
              return;
            }
            if (!fields) return;
            const target = record as Record<string, unknown>;
            for (const field of fields) {
              if (target[field] === undefined) target[field] = getSyriaNow();
            }
          };

          switch (operation) {
            case 'create':
            case 'createMany':
              if (Array.isArray(data)) {
                data.forEach((item) => apply(item, modelCreated));
              } else {
                apply(data, modelCreated);
              }
              break;
            case 'update':
            case 'updateMany':
              apply(data, modelUpdated);
              break;
            case 'upsert': {
              const upsertArgs = args as { create?: unknown; update?: unknown };
              apply(upsertArgs.create, modelCreated);
              apply(upsertArgs.update, modelUpdated);
              break;
            }
            default:
              break;
          }

          return query(args); // eslint-disable-line @typescript-eslint/no-unsafe-return
        },
      },
    });

    extended
      .$connect()
      .then(() =>
        this.logger.log('Prisma connected; timestamps use Syria time (+03:00)'),
      )
      .catch(() =>
        this.logger.warn(
          'Prisma connection failed (will retry on first query)',
        ),
      );

    return extended as unknown as PrismaService;
  }
}
