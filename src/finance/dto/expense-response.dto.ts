export class ExpenseResponseDto {
  id: string;
  type: string;
  name: string;
  amount: string;
  month?: number;
  year?: number;
  createdAt: string;
}
