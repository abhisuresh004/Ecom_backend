import Order from "../models/ordermodel.js";
import User from "../models/user.js";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import process from "process";
import dotenv from "dotenv";
import Products from "../models/productmodel.js";
import Notification from "../models/notificationmodel.js";
import Cart from "../models/cartmodel.js";

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
    const { address } = req.body;

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

    const order = new Order({
      user: userId,
      items: orderitems,
      price: totalprice,
      address,
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

    res.status(201).json({ message: "Order placed successfully", order });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error placing order", error: error.message });
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
    const { startdate, enddate } = req.query;

    let matchStage = {};

    if (startdate && enddate) {
      matchStage.createdAt = {
        $gte: new Date(startdate),
        $lte: new Date(enddate),
      };
    }

    const analytics = await Order.aggregate([
      { $match: matchStage },

      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$price" },
              },
            },
          ],

          productwisesales: [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.productId",
                totalSold: { $sum: "$items.quantity" },
                revenue: {
                  $sum: {
                    $multiply: ["$items.quantity", "$items.price"],
                  },
                },
              },
            },
            { $sort: { revenue: -1 } },
          ],

          dailyRevenue: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                  },
                },
                revenue: { $sum: "$price" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          topProducts: [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.productId",
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

    if (!result || result.totals.length === 0) {
      return res.json({
        success: true,
        message: "No details yet",
        data: {
          totals: {
            totalOrders: 0,
            totalRevenue: 0,
          },
          productwisesales: [],
          dailyRevenue: [],
          topProducts: [],
        },
      });
    }

    res.json({
      success: true,
      data: {
        totals: result.totals[0],
        productwisesales: result.productwisesales,
        dailyRevenue: result.dailyRevenue,
        topProducts: result.topProducts,
      },
    });
  } catch (e) {
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
