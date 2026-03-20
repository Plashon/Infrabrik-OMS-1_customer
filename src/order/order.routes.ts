import { Router } from "express";
import {
  createOrder,
  updateOrderStatus,
  getCustomerOrders,
  getSalesReport,
  getOrdersByMonth,
  getTopCustomers,
} from "./order.controller";

const router = Router();

// Order CRUD
router.post("/create", createOrder);
router.put("/update-status/:id", updateOrderStatus);
router.get("/customer/:customerId", getCustomerOrders);

// Reports
router.get("/reports/sales", getSalesReport);
router.get("/reports/orders-by-month", getOrdersByMonth);
router.get("/reports/top-customers", getTopCustomers);

export default router;

