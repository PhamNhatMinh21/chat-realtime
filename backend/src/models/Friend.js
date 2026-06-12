//models/Friend.js
import mongoose from "mongoose";

const friendSchema = new mongoose.Schema({
    userA: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    userB: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
},{
    timestamps: true,
})
// truoc khi luu phai chuan hoa ki tu userA < userB => middleware

// doan nay se chay du lieu truoc khi vao db
// Middleware chuẩn hóa: Đảm bảo userA luôn nhỏ hơn userB (về mặt chuỗi)
friendSchema.pre('save', function (next){
    const a = this.userA.toString();
    const b = this.userB.toString();

    if(a>b){
        const temp = this.userA;
        this.userA = this.userB;
        this.userB = temp;
    }
});

// Tạo index duy nhất để không bao giờ có 2 bản ghi cho cùng 1 cặp bạn bè
friendSchema.index({userA: 1, userB: 1}, {unique: true});

const Friend = mongoose.model("Friend", friendSchema);

export default Friend;