import { Router } from "express";
import {
  createProduct,
  createCategory,
  createProductSet,
  createProductSetItem,
  getAllCategories,
  getAllProducts,
  getAllProductSet,
  getAllProductSetItems,
  getCategoryById,
  getProductById,
  getProductSetById,
  getProductSetItemById,
  deleteCategory,
  deleteProduct,
  deleteProductSet,
  deleteProductSetItem,
  updateCategory,
  updateProduct,
  updateProductSet,
  updateProductSetItem,
} from "./product.controller";

const router = Router();

router.post("/category/create", createCategory);
router.get("/category/getAll", getAllCategories);
router.get("/category/get/:id", getCategoryById);
router.put("/category/update/:id", updateCategory);
router.delete("/category/delete/:id", deleteCategory);

router.post("/product/create", createProduct);
router.get("/product/getAll", getAllProducts);
router.get("/product/get/:id", getProductById);
router.put("/product/update/:id", updateProduct);
router.delete("/product/delete/:id", deleteProduct);

router.post("/product-set/create", createProductSet);
router.get("/product-set/getAll", getAllProductSet);
router.get("/product-set/get/:id", getProductSetById);
router.put("/product-set/update/:id", updateProductSet);
router.delete("/product-set/delete/:id", deleteProductSet);

router.post("/set-item/create", createProductSetItem);
router.get("/set-item/getAll", getAllProductSetItems);
router.get("/set-item/get/:id", getProductSetItemById);
router.put("/set-item/update/:id", updateProductSetItem);
router.delete("/set-item/delete/:id", deleteProductSetItem);
export default router;
