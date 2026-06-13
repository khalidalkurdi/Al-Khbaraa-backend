export class NotificationResponseDto {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
}
