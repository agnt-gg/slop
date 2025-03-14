import type { PayGetByIdResponse, PayPostResponse, TransactionId } from "../slop.ts";
import { generateTransactionId } from "./utils.ts";

export class PayManager {
  #transactions: Map<TransactionId, PayGetByIdResponse>;

  constructor() {
    this.#transactions = new Map();
  }

  createPayment(
    amount: number,
    currency: string,
    description: string,
    payment_method: string,
  ): PayPostResponse {
    const transactionId = generateTransactionId();
    const timestamp = new Date().toISOString();

    const transaction: PayGetByIdResponse = {
      transaction_id: transactionId,
      amount,
      currency,
      description,
      status: "success",
      created_at: timestamp,
      receipt_url: `https://example.com/receipts/${transactionId}`,
      payment_method,
    };

    this.#transactions.set(transactionId, transaction);

    return {
      transaction_id: transactionId,
      status: "success",
      receipt_url: transaction.receipt_url,
    };
  }

  getTransaction(id: TransactionId): PayGetByIdResponse | null {
    return this.#transactions.get(id) || null;
  }
}
