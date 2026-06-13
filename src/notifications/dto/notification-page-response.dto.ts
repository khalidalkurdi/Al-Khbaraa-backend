import { NotificationResponseDto } from './notification-response.dto';

export class NotificationPageResponseDto {
  data: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
}
