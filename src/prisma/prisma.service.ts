import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getSyriaNow } from '../common/utils/syria-date.util';
import * as path from 'path';
import * as fs from 'fs';

type TimestampFields = {
  created: Map<string, string[]>;
  updated: Map<string, string[]>;
};

function buildTimestampFields(): TimestampFields {
  const created = new Map<string, string[]>();
  const updated = new Map<string, string[]>();

  let schemaContent: string | undefined;
  const candidates = [
    path.join(process.cwd(), 'prisma', 'schema.prisma'),
    path.join(process.cwd(), 'schema.prisma'),
    path.join(__dirname, '..', '..', 'prisma', 'schema.prisma'),
  ];

  for (const candidate of candidates) {
    try {
      schemaContent = fs.readFileSync(candidate, 'utf-8');
      break;
    } catch {
      // try next candidate
    }
  }

  if (!schemaContent) return { created, updated };

  try {
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match: RegExpExecArray | null;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const body = match[2];
      const createdFields: string[] = [];
      const updatedFields: string[] = [];

      for (const rawLine of body.split('\n')) {
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith('//')) continue;
        const line = trimmed.split('//')[0].trim();
        if (!line) continue;

        const createdMatch = line.match(
          /^(\w+)\s+DateTime\b.*@default\(now\(\)\)/,
        );
        if (createdMatch) {
          createdFields.push(createdMatch[1]);
        }

        const updatedMatch = line.match(/^(\w+)\s+DateTime\b.*@updatedAt/);
        if (updatedMatch) {
          updatedFields.push(updatedMatch[1]);
        }
      }

      if (createdFields.length) created.set(modelName, createdFields);
      if (updatedFields.length) updated.set(modelName, updatedFields);
    }
  } catch {
    // parsing failed; return empty maps to avoid crashing
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
