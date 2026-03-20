import z from "zod";
import { CustomerType, OrganizationType } from "@prisma/client";

// ฟิลด์ common สำหรับลูกค้า
const baseCustomerFields = {
  customerType: z.enum(Object.values(CustomerType) as [string, ...string[]]),
  customerCode: z.string().trim().length(7, "กรุณากรอกรหัสลูกค้า"),
  companyName: z.string(),
  email: z.string().email("กรุณากรอกอีเมลให้ถูกต้อง"),
  taxId: z.string().trim().length(13, "กรุณากรอกเลขประจำตัวผู้เสียภาษี"),
  phoneNumber: z.string().trim().length(10).optional(),
  profileImageUrl: z.string().url().optional(),
};

// Address Validator
const AddressValidator = z.object({
  addressName: z.string(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  addressesInfo: z.string(),
  zipcode: z.string(),
  subdistrict: z.string(),
  province: z.string(),
  district: z.string(),
});

// HEAD_OFFICE Validator
const HeadOfficeValidator = z.object({
  ...baseCustomerFields,
  organizationType: z.literal("HEAD_OFFICE"),
  addresses: z.array(AddressValidator).min(1, "กรุณากรอกที่อยู่อย่างน้อย 1 รายการ"),
});

// BRANCH_OFFICE Validator
const BranchOfficeValidator = z.object({
  ...baseCustomerFields,
  organizationType: z.literal("BRANCH_OFFICE"),
  branchId: z.string(),
  branchName: z.string(),
  addresses: z.array(AddressValidator).min(1, "กรุณากรอกที่อยู่อย่างน้อย 1 รายการ"),
});


// Update customer (ทุก field เป็น optional)
const UpdateCustomerValidator = z.object({
  customerType: baseCustomerFields.customerType.optional(),
  organizationType: z.enum(Object.values(OrganizationType) as [string, ...string[]]).optional(),
  customerCode: baseCustomerFields.customerCode.optional(),
  companyName: baseCustomerFields.companyName.optional(),
  email: baseCustomerFields.email.optional(),
  taxId: baseCustomerFields.taxId.optional(),
  phoneNumber: baseCustomerFields.phoneNumber.optional(),
  profileImageUrl: baseCustomerFields.profileImageUrl.optional(),
  branchId: z.string().optional(),
  branchName: z.string().optional(),
  addresses: z.array(AddressValidator).optional(),
});

const CreateCustomerValidator = z.union([HeadOfficeValidator, BranchOfficeValidator]);

export const CustomerValidator = {
  validateCreateCustomer: CreateCustomerValidator,
  validateUpdateCustomer: UpdateCustomerValidator,
};

// Type-safe
export type ValidateCreateCustomer = z.infer<typeof CustomerValidator['validateCreateCustomer']>;
export type ValidateUpdateCustomer = z.infer<typeof CustomerValidator['validateUpdateCustomer']>;
export type HeadOfficeType = z.infer<typeof HeadOfficeValidator>;
export type BranchOfficeType = z.infer<typeof BranchOfficeValidator>;
export type CustomerTypeSafe = HeadOfficeType | BranchOfficeType;

export default CustomerValidator;
