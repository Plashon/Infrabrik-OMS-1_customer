import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  deleteProduct,
  updateProduct,
} from "./product.controller";

const router = Router();

router.post("/product/create", createProduct);
router.get("/product/getAll", getAllProducts);
router.get("/product/get/:id", getProductById);
router.put("/product/update/:id", updateProduct);
router.delete("/product/delete/:id", deleteProduct);

export default router;
