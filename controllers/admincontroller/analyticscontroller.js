import Order from "../../models/ordermodel.js";
import Product from "../../models/productmodel.js";
import User from "../../models/user.js";

export const getDashboardData = async (req, res) => {
  try {
    const ActiveOrders = await Order.countDocuments({
      status: { $in: ["Pending", "Processing", "Shipped", "orderplaced"] },
    });
    const totalusers = await User.countDocuments({ role: { $ne: "admin" } });
    const totalProducts = await Product.countDocuments();
    const totalRevenue = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          total: { $sum: "$price" },
        },
      },
    ]);

    res.json({
      ActiveOrders,
      totalProducts,
      totalRevenue,
      totalusers,
    });
  } catch (e) {
    res.json({ message: "Error occurred", e });
  }
};

export const getRevenueanalytics = async (req, res) => {
  try {
    const { startdate, enddate } = req.query;

    let matchStage = {};

    // ✅ Optional date filter
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
          // 🔹 Total stats
          totals: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$price" },
              },
            },
          ],

          // 🔹 Daily revenue (FIXED)
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
              },
            },
            { $sort: { _id: 1 } },
          ],

          // 🔥 NEW: Monthly Revenue
          monthlyRevenue: [
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                revenue: { $sum: "$price" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
        },
      },
    ]);

    res.json(analytics[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const { startDate, endDate, limit = 5 } = req.query;

    let matchStage = {
      status: "delivered",
    };

    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({
          message: "startDate cannot be greater than endDate",
        });
      }
    }

    // ✅ Flexible date filter
    if (startDate || endDate) {
      matchStage.createdAt = {};

      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    const topProducts = await Order.aggregate([
      { $match: matchStage },

      { $unwind: "$items" },

      {
        $group: {
          _id: "$items.product", // ✅ FIXED
          totalSold: { $sum: "$items.quantity" },
        },
      },

      { $sort: { totalSold: -1 } },
      { $limit: Number(limit) },

      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },

      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          revenue: {
            $multiply: ["$totalSold", "$product.price"],
          },
        },
      },

      {
        $project: {
          _id: 0,
          productId: "$product._id",
          name: "$product.name",
          price: "$product.price",
          image: "$product.image",
          totalSold: 1,
          revenue: 1,
        },
      },
    ]);

    res.status(200).json({
      message: "Top products fetched successfully",
      topProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
