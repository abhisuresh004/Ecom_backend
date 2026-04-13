import User from "../../models/user.js";
export const getAlluser = async (req, res) => {
  try {
    const userDetails = await User.find().select("-password");
    const filtereduser = await userDetails.filter(
      (items) => items.role !== "admin",
    );

    res
      .status(200)
      .json({ message: "Userdetails fetched successfully", filtereduser });
  } catch (e) {
    res.json({ message: "error occured", e });
  }
};

export const getUserbyId = async (req, res) => {
  const { id } = req.params;
  console.log("Params:", req.params);

  try {
    const userDetails = await User.findById(id).select("-password");

    if (!userDetails) {
      return res.status(404).json({ message: "User not found" });
    }
    res
      .status(200)
      .json({ message: "userdetails fecthed successfully", userDetails });
  } catch (e) {
    res.json({ message: "Error occured", e });
  }
};

export const blockuser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    user.role = "blocked";

    await user.save();
    res.json({ message: "User blocked",user });
  } catch (e) {
    res.json({ message: "Error occured", e });
  }
};

export const unblockuser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    user.role = "user";
    await user.save();
    res.json({ message: "User unblocked",user });
  } catch (e) {
    res.json({ message: "", e });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User Deleted Successfully", user });
  } catch (e) {
    res.json({ message: "Error occured", e });
  }
};
