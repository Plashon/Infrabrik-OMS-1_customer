import z from "zod";
import { OrderStatus, PaymentMethod } from "@prisma/client";

// AddressInfo validator (สำหรับ shippingAddress)
const AddressInfoValidator = z.object({
  addressName: z.string().min(1, "กรุณากรอกชื่อที่อยู่"),
  recipientName: z.string().min(1, "กรุณากรอกชื่อผู้รับ"),
  recipientPhone: z.string().min(1, "กรุณากรอกเบอร์โทรผู้รับ"),
  addressesInfo: z.string().min(1, "กรุณากรอกที่อยู่"),
  zipcode: z.string().min(1, "กรุณากรอกรหัสไปรษณีย์"),
  subdistrict: z.string().min(1, "กรุณากรอกตำบล/แขวง"),
  province: z.string().min(1, "กรุณากรอกจังหวัด"),
  district: z.string().min(1, "กรุณากรอกอำเภอ/เขต"),
});

// OrderItem validator
const OrderItemValidator = z.object({
  productId: z.string().min(1, "กรุณาระบุรหัสสินค้า"),
  quantity: z.number().int().min(1, "จำนวนต้องมากกว่า 0"),
});

// Create Order Schema (รับ customerId, addressId, items)
const CreateOrderSchema = z.object({
  customerId: z.string().min(1, "กรุณาระบุรหัสลูกค้า"),
  addressId: z.string().min(1, "กรุณาระบุรหัสที่อยู่"),
  items: z.array(OrderItemValidator).min(1, "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ"),
  discount: z.number().min(0).optional().default(0),
  paymentMethod: z.enum(Object.values(PaymentMethod) as [string, ...string[]]),
});

// Update Order Status Schema
const UpdateOrderStatusSchema = z.object({
  status: z.enum(Object.values(OrderStatus) as [string, ...string[]]),
});

const OrderValidator = {
  CreateOrderValidator: CreateOrderSchema,
  UpdateOrderStatusValidator: UpdateOrderStatusSchema,
  AddressInfoValidator,
};

export type ValidateCreateOrder = z.infer<typeof CreateOrderSchema>;
export type ValidateUpdateOrderStatus = z.infer<typeof UpdateOrderStatusSchema>;

export default OrderValidator;