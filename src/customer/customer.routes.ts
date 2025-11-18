import { Router } from "express";
import {
  createContactInformation,
  getAllCustomers,
  getCustomerById,
  deleteCustomerInformation,
  editCustomerInformation,
  getAllAddressesByCustomerId,
  createAddressForCustomer,
} from "./customer.controller";

const router = Router();

router.get("/get-all", getAllCustomers); 
router.get("/get-by-id/:id", getCustomerById);
router.get("/:id", getAllAddressesByCustomerId);
router.post("/create-address/:id", createAddressForCustomer);
router.post("/create", createContactInformation);
router.delete("/delete/:id", deleteCustomerInformation);
router.put("/edit/:id", editCustomerInformation);


export default router;
