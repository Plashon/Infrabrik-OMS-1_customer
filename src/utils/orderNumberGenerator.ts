import prisma from "../prisma/client";

/**
 * Generate order number in format: ORD-YYYYMM-NNNN
 * Example: ORD-202511-0001
 *
 * @param maxRetries - Maximum number of retries if order number exists (default: 10)
 * @returns Promise<string> - Generated order number
 */
export async function generateOrderNumber(
  maxRetries: number = 10
): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const dateStr = `${year}${month}`; // YYYYMM
  const prefix = `ORD-${dateStr}-`;

  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: "desc",
    },
  });

  let sequence = 1;

  if (lastOrder) {
    const parts = lastOrder.orderNumber.split("-");
    if (parts.length === 3) {
      const lastSequenceStr = parts[2];
      const lastSequence = parseInt(lastSequenceStr, 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const sequenceStr = sequence.toString().padStart(4, "0");
    const orderNumber = `${prefix}${sequenceStr}`;

    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!existingOrder) {
      return orderNumber;
    }

    sequence++;
  }

  throw new Error(
    `Failed to generate unique order number after ${maxRetries} attempts`
  );
}
