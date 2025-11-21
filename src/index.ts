import express from "express";
import customerRouter from "./customer/customer.routes";
import addressesRouteter from "./addresses/addresses.routes";
import productRouter from "./products/product.routes";
import productSetRouter from "./productSet/productSet.routes";
import categoryRouter from "./category/category.routes";
import productSetItemRouter from "./productSetItem/productSetItem.routes";

import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.json());

app.use("/customer", customerRouter);
app.use("/addresses", addressesRouteter);
app.use("/products", productRouter);
app.use("/productSets", productSetRouter);
app.use("/category", categoryRouter);
app.use("/productSetItems", productSetItemRouter);

app.get("/", (req, res) => {
  res.send("<h1>this is API for Infrabrik OMS 1 Customer</h1>");
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:5000");
});
