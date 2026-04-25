import Order from "../models/ordermodel.js";
import User from "../models/user.js";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import process from "process";
import dotenv from "dotenv";
import Products from "../models/productmodel.js";
import Notification from "../models/notificationmodel.js";
import Cart from "../models/cartmodel.js";
import { razorpay } from "../config/razorpay.js";
import crypto from "crypto";
import PDFDOCUMENT from "pdfkit";
import path from "path";
dotenv.config();

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.email_user,
    pass: process.env.email_pass,
  },
});

export const placeOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { items, price, address } = req.body;

    const useremail = await User.findById(userId).select("email");

    if (items.length === 0 || price <= 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    if (!address || !price) {
      return res
        .status(400)
        .json({ message: "Address or price is must have value" });
    }

    const order = new Order({
      user: userId,
      items: items,
      price,
      address,
    });

    await order.save();

    const productUpdates = items.map(async (item) => {
      const product = await Products.findById(item.product);

      if (!product) return;

      if (product.quantity < item.quantity) {
        throw new Error(`Not enough stock for ${product.name}`);
      }

      product.quantity -= item.quantity;
      await product.save();

      if (product.quantity === 0) {
        await Notification.create({
          user: process.env.admin_id, // make sure this is ObjectId ✅
          title: "Out of Stock",
          message: `The product ${product.name}, ${product.sku} is now out of stock.`,
          product: item.product,
        });
      }

      if (product.quantity > 0 && product.quantity <= 5) {
        await Notification.create({
          user: process.env.admin_id,
          title: "Low Stock Alert",
          message: `Only ${product.quantity} items left for ${product.name}`,
          product: item.product,
        });
      }
    });

    await Promise.all(productUpdates);

    await Notification.create({
      user: userId,
      title: "Order Placed",
      message: "Your order has been placed successfully",
    });

    const populatedOrder = await Order.findById(order._id).populate(
      "items.product",
    );

    await transport.sendMail({
      from: process.env.email_user,
      to: useremail.email,
      subject: "Order Confirmation",
      text: `
Your order has been placed successfully!

Order ID: ${order._id}

Products:
${populatedOrder.items.map((item) => `- ${item.product.name} x ${item.quantity}`).join("\n")}

Total Price: $${price}

Delivered To : ${order.address}

Thank you for shopping with us!
  `,
    });

    res.status(201).json({ message: "Order placed successfully", order });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error placing order", error: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const userId = req.user.userId;

    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .populate("user", "name email address");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "NO orders yet" });
    }

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving orders", error });
  }
};

export const getOrderdetailsById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid Order ID" });
    }

    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate("items.product")
      .populate("user", "name email");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving order", error });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = req.params.id;
    const useremail = await User.findById(userId).select("email");
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid Order ID" });
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (["delivered", "cancelled"].includes(order.status)) {
      return res
        .status(400)
        .json({ message: `Cannot cancel an order that is ${order.status}` });
    }

    order.status = "cancelled";

    const populatedOrder = await Order.findById(order._id).populate(
      "items.product",
    );

    await transport.sendMail({
      from: process.env.email_user,
      to: useremail.email,
      subject: "Order Cancellation",
      text: `
Your order has been Cancelled!

Order ID: ${order._id}

Products:
${populatedOrder.items.map((item) => `- ${item.product.name} x ${item.quantity}`).join("\n")}



give your feedback!
  `,
    });

    await order.save();

    res.status(200).json({ message: "Order cancelled successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Error cancelling order", error });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = req.params.id;
    const { address } = req.body;

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (["delivered", "cancelled"].includes(order.status)) {
      return res
        .status(400)
        .json({ message: `Cannot update an order that is ${order.status}` });
    }

    order.address = address;

    order.save();
    res
      .status(200)
      .json({ message: "Order status updated successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Error updating order status", error });
  }
};

export const Orderfromcart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { address, paymentMethod } = req.body;

    if (!address) {
      return res.status(400).json({ message: "Address cannot be empty" });
    }

    const useremail = await User.findById(userId).select("email");

    const cart = await Cart.findOne({ userId: userId }).populate(
      "cartitems.productId",
    );

    if (!cart || cart.cartitems.length === 0) {
      res.status(204).json({ message: "Cart is Empty" });
    }

    const orderitems = cart.cartitems.map((i) => ({
      product: i.productId._id,
      quantity: i.quantity,
    }));

    const totalprice = cart.cartitems.reduce((total, items) => {
      return total + items.productId.price * items.quantity;
    }, 0);

    let razorpayOrder = null;
    if (paymentMethod === "online") {
      razorpayOrder = await razorpay.orders.create({
        amount: totalprice * 100,
        currency: "INR",
        receipt: "rcpt_" + Date.now(),
      });
    }

    const order = new Order({
      user: userId,
      items: orderitems,
      price: totalprice,
      address,
      paymentMethod,
      razorpayOrderId: razorpayOrder?.id,
    });

    await order.save();
    cart.cartitems = [];
    await cart.save();

    const productUpdates = orderitems.map(async (item) => {
      const product = await Products.findById(item.product);

      if (!product) return;

      if (product.quantity < item.quantity) {
        throw new Error(`Not enough stock for ${product.name}`);
      }

      product.quantity -= item.quantity;
      await product.save();

      if (product.quantity === 0) {
        await Notification.create({
          user: process.env.admin_id, // make sure this is ObjectId ✅
          title: "Out of Stock",
          message: `The product ${product.name}, ${product.sku} is now out of stock.`,
          product: item.product,
        });
      }

      if (product.quantity > 0 && product.quantity <= 5) {
        await Notification.create({
          user: process.env.admin_id,
          title: "Low Stock Alert",
          message: `Only ${product.quantity},${product.sku} items left for ${product.name}`,
          product: item.product,
        });
      }
    });

    await Promise.all(productUpdates);

    await Notification.create({
      user: userId,
      title: "Order Placed",
      message: "Your order has been placed successfully",
    });

    const populatedOrder = await Order.findById(order._id).populate(
      "items.product",
    );

    await transport.sendMail({
      from: process.env.email_user,
      to: useremail.email,
      subject: "Order Confirmation",
      text: `
Your order has been placed successfully!

Order ID: ${order._id}

Products:
${populatedOrder.items.map((item) => `- ${item.product.name} x ${item.quantity}`).join("\n")}

Total Price: $${totalprice}

Delivered To : ${address}

Thank you for shopping with us!
  `,
    });

    res
      .status(201)
      .json({ message: "Order placed successfully", order, razorpayOrder });
  } catch (error) {
    res.status(500).json({ error: error });
  }
};

// Admin controllers

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.product")
      .populate("user", "name email address");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "NO orders yet" });
    }

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving orders", error });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    if (
      ![
        "orderplaced",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ].includes(status)
    ) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.status = status;
    await order.save();

    res
      .status(200)
      .json({ message: "Order status updated successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Error updating order status", error });
  }
};

export const getOrdersperday = async (req, res) => {
  try {
    const ordersPerDay = await Order.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          orders: { $sum: 1 },
          totalRevenue: { $sum: "$price" },
        },
      },
    ]);

    res.status(200).json(ordersPerDay);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving orders per day", error });
  }
};

export const getOrderanalytics = async (req, res) => {
  try {
    const { daily, weekly, monthly, startdate, enddate } = req.query;

    // =========================
    // VALIDATION
    // =========================
    const selected = [daily, weekly, monthly].filter(v => v === "true");

    if (selected.length > 1) {
      return res.status(400).json({
        error: "Choose only one: daily OR weekly OR monthly",
      });
    }

    // =========================
    // DATE FILTER (PRIORITY LOGIC)
    // =========================
    let matchStage = {};

    // 🔥 1. CUSTOM DATE RANGE (HIGHEST PRIORITY)
    if (startdate && enddate) {
      const start = new Date(startdate);
      const end = new Date(enddate);

      end.setHours(23, 59, 59, 999);

      matchStage.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    // 🔥 2. DAILY = TODAY ONLY
    else if (daily === "true") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      matchStage.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    // 🔥 3. WEEKLY = LAST 7 DAYS
    else if (weekly === "true") {
      const start = new Date();
      start.setDate(start.getDate() - 7);

      matchStage.createdAt = {
        $gte: start,
      };
    }

    // 🔥 4. MONTHLY = LAST 30 DAYS
    else if (monthly === "true") {
      const start = new Date();
      start.setDate(start.getDate() - 30);

      matchStage.createdAt = {
        $gte: start,
      };
    }

    // =========================
    // GROUPING
    // =========================
    let groupByDate = {
      $dateToString: {
        format: "%Y-%m-%d",
        date: "$createdAt",
        timezone: "Asia/Kolkata",
      },
    };

    if (weekly === "true") {
      groupByDate = {
        $dateTrunc: {
          date: "$createdAt",
          unit: "week",
          timezone: "Asia/Kolkata",
        },
      };
    }

    if (monthly === "true") {
      groupByDate = {
        $dateTrunc: {
          date: "$createdAt",
          unit: "month",
          timezone: "Asia/Kolkata",
        },
      };
    }

    // =========================
    // AGGREGATION
    // =========================
    const analytics = await Order.aggregate([
      { $match: matchStage },

      {
        $facet: {

          // =====================
          // TOTALS
          // =====================
          totals: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$price" },
              },
            },
          ],

          // =====================
          // REVENUE BY PERIOD
          // =====================
          revenueByPeriod: [
            {
              $group: {
                _id: groupByDate,
                revenue: { $sum: "$price" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // =====================
          // PRODUCT WISE SALES
          // =====================
          productwisesales: [
            { $unwind: "$items" },

            {
              $addFields: {
                productObjId: {
                  $cond: {
                    if: { $eq: [{ $type: "$items.product" }, "objectId"] },
                    then: "$items.product",
                    else: { $toObjectId: "$items.product" },
                  },
                },
              },
            },

            {
              $lookup: {
                from: "products",
                localField: "productObjId",
                foreignField: "_id",
                as: "productdata",
              },
            },

            {
              $unwind: {
                path: "$productdata",
                preserveNullAndEmptyArrays: true,
              },
            },

            {
              $group: {
                _id: "$productObjId",
                name: { $first: "$productdata.name" },
                price: { $first: "$productdata.price" },
                image: {
                  $first: { $arrayElemAt: ["$productdata.image", 0] },
                },
                totalSold: { $sum: "$items.quantity" },
                revenue: {
                  $sum: {
                    $multiply: ["$items.quantity", "$productdata.price"],
                  },
                },
              },
            },

            { $sort: { revenue: -1 } },
          ],

          // =====================
          // TOP PRODUCTS
          // =====================
          topProducts: [
            { $unwind: "$items" },

            {
              $addFields: {
                productObjId: {
                  $cond: {
                    if: { $eq: [{ $type: "$items.product" }, "objectId"] },
                    then: "$items.product",
                    else: { $toObjectId: "$items.product" },
                  },
                },
              },
            },

            {
              $lookup: {
                from: "products",
                localField: "productObjId",
                foreignField: "_id",
                as: "productdata",
              },
            },

            {
              $unwind: {
                path: "$productdata",
                preserveNullAndEmptyArrays: true,
              },
            },

            {
              $group: {
                _id: "$productObjId",
                name: { $first: "$productdata.name" },
                price: { $first: "$productdata.price" },
                image: {
                  $first: { $arrayElemAt: ["$productdata.image", 0] },
                },
                totalSold: { $sum: "$items.quantity" },
              },
            },

            { $sort: { totalSold: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]);

    const result = analytics[0];

    // =========================
    // EMPTY RESPONSE
    // =========================
    if (!result || !result.totals.length) {
      return res.json({
        success: true,
        message: "No data found",
        data: {
          totals: { totalOrders: 0, totalRevenue: 0 },
          revenueByPeriod: [],
          productwisesales: [],
          topProducts: [],
        },
      });
    }

    // =========================
    // FINAL RESPONSE
    // =========================
    res.json({
      success: true,
      data: {
        totals: result.totals[0],
        revenueByPeriod: result.revenueByPeriod,
        productwisesales: result.productwisesales,
        topProducts: result.topProducts,
      },
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

export const getOrderadminById = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid Order ID" });
    }

    const order = await Order.findOne({ _id: orderId })
      .populate("items.product")
      .populate("user", "name email address");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving order", error });
  }
};

// payment for order

export const createorder = async (req, res) => {
  try {
    const { items, price, address, paymentMethod } = req.body;

    for (const item of items) {
      const product = await Products.findById(item.product);

      if (!product) {
        // throw new Error("Product not found");
        return res.status(404).json({ message: "Product Not Found" });
      }

      if (product.quantity < item.quantity) {
        // throw new Error(`Not enough stock for ${product.name}`);
        return res
          .status(404)
          .json({ message: `Not enough stock for ${product.name}` });
      }
    }

    let razorpayOrder = null;
    if (paymentMethod === "online") {
      razorpayOrder = await razorpay.orders.create({
        amount: price * 100,
        currency: "INR",
        receipt: "rcpt_" + Date.now(),
      });
    }

    const order = await Order.create({
      user: req.user.userId,
      items,
      price,
      address,
      paymentMethod,
      razorpayOrderId: razorpayOrder?.id,
    });
    res.json({ order, razorpayOrder });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving order", error });
  }
};

export const verifypayment = async (req, res) => {
  try {
    const userId = req.user.userId;

    const useremail = await User.findById(userId).select("email");
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment details",
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    console.log("expectedsignature", expectedSignature);
    console.log("razorpay_signature", razorpay_signature);

    if (expectedSignature !== razorpay_signature) {
      await Order.findOneAndDelete({
        razorpayOrderId: razorpay_order_id,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid signature - possible tampering",
      });
    }

    const check = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!check) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        paymentStatus: "paid",
        razorpayPaymentId: razorpay_payment_id,
      },
    );

    const populatedOrder = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
    }).populate("items.product");

    const productUpdate = populatedOrder.items.map(async (item) => {
      const product = await Products.findById(item.product);

      if (!product) return;

      if (product.quantity < item.quantity) {
        throw new Error(`Not enough stock for ${product.name}`);
      }

      product.quantity -= item.quantity;
      await product.save();

      if (product.quantity === 0) {
        await Notification.create({
          user: process.env.admin_id, // make sure this is ObjectId ✅
          title: "Out of Stock",
          message: `The product ${product.name}, ${product.sku} is now out of stock.`,
          product: item.product,
        });
      }

      if (product.quantity > 0 && product.quantity <= 5) {
        await Notification.create({
          user: process.env.admin_id,
          title: "Low Stock Alert",
          message: `Only ${product.quantity} items left for ${product.name}`,
          product: item.product,
        });
      }
    });

    await Promise.all(productUpdate);

    await Notification.create({
      user: userId,
      title: "Order Placed",
      message: "Your order has been placed successfully",
    });

    await transport.sendMail({
      from: process.env.email_user,
      to: useremail.email,
      subject: "Order Confirmation",
      text: `
Your order has been placed successfully!

Order ID: ${populatedOrder._id}

Products:
${populatedOrder.items.map((item) => `- ${item.product.name} x ${item.quantity}`).join("\n")}

Total Price: ₹${populatedOrder.price}

Delivered To : ${populatedOrder.address}

Thank you for shopping with us!
  `,
    });

    return res.json({
      success: true,
      message: "Payment verified",
      paymentId: razorpay_payment_id,
      orderrazorpayId: razorpay_order_id,
      orderId: populatedOrder._id,
      amount: check.price,
      status: "paid",
    });
  } catch (error) {
    console.log("VERIFY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// invoice

export const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({ message: "Bad Request , OrderId Required !!" });
    }

    const orderDetails = await Order.findById(orderId)
      .populate("items.product")
      .populate("user");
    if (!orderDetails) {
      res.status(404).json({ message: "Order Not Found" });
    }

    const user = await User.findById(orderDetails.user);

    if (!user) {
      res.status(404).json({ message: "user Not Found" });
    }

    const doc = new PDFDOCUMENT({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice_${orderId}.pdf`,
    );

    doc.pipe(res);

    const logopath = path.join(process.cwd(), "assets", "logo.png");
    doc.image(logopath, 50, 10, { width: 150 });

    const startX = 50;
    const rightX = 350;
    let y = 120;

    // 🔹 HEADER LINE
    doc.moveTo(50, 100).lineTo(550, 100).stroke();

    // 🔹 LEFT SIDE (Company)
    doc.fontSize(18).fillColor("green").text("Gadget Groove", 250, 30);
    doc.fillColor("black");

    doc.fontSize(10).text("Kundara, Kerala, India", 250, 50);

    // 🔹 RIGHT SIDE (Invoice Title)
    doc.fontSize(16).text("INVOICE", 250, 70);

    // 🔹 ORDER DETAILS (RIGHT SIDE)
    y += 20;

    doc.fontSize(12);
    doc.text(`Order ID:`, rightX, y);
    doc.text(orderDetails._id, rightX, y + 15);

    doc.text(`Payment ID:`, rightX, y + 35);
    doc.text(orderDetails.razorpayPaymentId, rightX, y + 50);

    doc.text(`Date:`, rightX, y + 70);
    doc.text(
      new Date(orderDetails.createdAt).toLocaleDateString(),
      rightX,
      y + 85,
    );

    // 🔹 CUSTOMER DETAILS (LEFT)
    doc.text(`Customer: ${user.username}`, startX, y);
    doc.text(`Address: ${orderDetails.address}`, startX, y + 20);

    // 🔹 LINE BREAK
    doc
      .moveTo(50, y + 110)
      .lineTo(550, y + 110)
      .stroke();

    y += 130;

    // 🔹 TABLE HEADER
    doc.fontSize(12).text("Item", startX, y);
    doc.text("Qty", 300, y);
    doc.text("Price", 400, y);
    doc.text("Total", 480, y);

    doc
      .moveTo(50, y + 15)
      .lineTo(550, y + 15)
      .stroke();

    y += 25;

    // 🔹 ITEMS LOOP (ALIGNED TABLE)
    orderDetails.items.forEach((item) => {
      const total = item.quantity * item.product.price;

      doc.text(item.product.name, startX, y);
      doc.text(item.quantity.toString(), 300, y);
      doc.text(`Rs.${item.product.price}`, 400, y);
      doc.text(`Rs.${total}`, 480, y);

      y += 20;
    });

    // 🔹 TOTAL SECTION
    doc
      .moveTo(300, y + 10)
      .lineTo(550, y + 10)
      .stroke();

    y += 20;

    doc.fontSize(14).text("Total Amount:", 350, y);

    doc.fontSize(14).text(`Rs.${orderDetails.price}`, 480, y);

    // 🔹 FOOTER
    doc.fontSize(10).text("Thank you for your purchase!", 50, y + 50, {
      align: "center",
      width: 500,
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ error });
  }
};
