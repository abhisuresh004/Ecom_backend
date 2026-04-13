import Notification from "../models/notificationmodel.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = await Notification.find({ user: userId }).sort({
      createdAt: -1,
    });
    if (!notifications) {
      return res.status(404).json({ message: "No Notifications yet" });
    }

    res
      .status(200)
      .json({ message: "Notification Fetched Successfully", notifications });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving notifications", e: error.message });
  }
};

export const marksAsread = async (req, res) => {
  try {
    // const userId = req.user.userId;
    const { id } = req.params;
    const { isRead } = req.body;

    const notifications = await Notification.findByIdAndUpdate(id, { isRead });

    if (!notifications) {
      return res.status(404).json("Notification not found");
    }
    // if (notifications.user.toString() !== userId) {
    //   return res.status(401).json("You are not  Authorized");
    // }

    res.status(200).json("Notification marked as read");
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving notifications", e: error.message });
  }
};
