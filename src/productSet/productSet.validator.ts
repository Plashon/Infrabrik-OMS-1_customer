import z from "zod";

const ProductSetSchema = z.object({
  setName: z.string().min(1, "Set name is required"),
  setCode: z.string().min(1, "Set code is required"),
});

const UpdateProductSetSchema = ProductSetSchema.partial();

const ProductSet = {
  CreateProductSetValidator: ProductSetSchema,
  UpdateProductSetValidator: UpdateProductSetSchema,
};
export type ValidateCreateProductSet = z.infer<
  (typeof ProductSet)["CreateProductSetValidator"]
>;
export type ValidatorUpdateProductSet = z.infer<
  (typeof ProductSet)["UpdateProductSetValidator"]
>;

export default ProductSet;
