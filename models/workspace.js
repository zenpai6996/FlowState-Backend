import mongoose, { Schema ,model} from 'mongoose';

const workspaceModel = new Schema({
  name:{
    type: String,
    required: true,
    trim: true
  },
  description:{
    type: String,
    trim: true
  },
  color:{
    type: String,
    default: "#FF9F1C",
  },
  owner:{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members:[{
    user: {
      type: Schema.Types.ObjectId, 
      ref: 'User'
    },
    role:{
      type: String,
      enum: ['admin', 'member',"viewer"],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
],
projects:[{
  type: Schema.Types.ObjectId,
  ref: 'Project',
}],
},{
  timestamps:true
});

const Workspace = model("Workspace",workspaceModel);

export default Workspace;