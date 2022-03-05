const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

// utc time based
// console.log(new Date().toISOString().match(/(\d{4}-\d{2}-\d{2})[A-Z]+/)[1])

// local time base
// console.log(new Date().toString())

// console.log(new Date())
// console.log(new Date().toUTCString())
// console.log(new Date().toISOString())

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide username']
  },
  exercises: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise'
    }]
  }
})

const User = new mongoose.model('User', UserSchema)

// https://mongoosejs.com/docs/tutorials/dates.html

const ExerciseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Please provide exercise description']
  },
  duration: {
    type: Number,
    required: [true, 'Please provide duration']
  },
  date: {
    type: Date,
    default: new Date()
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide user db id'],
  }
})

const Exercise = mongoose.model('Exercise', ExerciseSchema)

const connectDB = (connectionStr) => mongoose.connect(connectionStr, 
  {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  }
)

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
// parse form data
app.use('/api/users', express.urlencoded({extended: false}))

app.post('/api/users', async (req, res) => {
  try {
    console.log(req.body)
    const user = await User.create({...req.body})
    // if (user._id instanceof mongoose.Types.ObjectId) {
    //   console.log('Bingo')
    // }
    res.status(201).json(user)
  } catch(err) {
    console.log(err.message)
    res.status(500).json(err.message)
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({})
    res.status(200).json(users)
  } catch(err) {
    console.log(err.message)
    res.status(500).json(err.message)
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const {_id: createdBy} = req.params
    const {description, duration, date} = req.body
    const updateObject = {description, duration, createdBy}
    if (date) {
      updateObject.date = date
    }
  
    const exercise = await Exercise.create(updateObject)
    // user is instanceof User
    // remove _id from user
    // const user = await User.findOneAndUpdate({_id: createdBy}, {$push: {exercises: exercise._id}}, {new: true, runValidators: true})
    //                       .select({username: 1, _id: 0})
    // user = await User.findOne({_id: createdBy}).populate('exercises')
    const user = await User.findOneAndUpdate({_id: createdBy}, {$push: {exercises: exercise._id}}, {new: true, runValidators: true})
                           .select({username: 1})
    res.status(201).json({...user.toObject(), description: exercise.description, duration: exercise.duration, date: exercise.date})

  } catch(err) {
    console.log(err.message)
    res.status(500).json(err.message)
  }
})

app.get('/api/users/:_id/logs', async (req,res)=>{
  try {  
    const {_id} = req.params
    const {from, to, limit} = req.query // from and to is String
    const queryObject = {path: 'exercises', select: 'description date duration -_id'}

    if (from && !to) {
      queryObject.match = {date: {$gte: from}}
    }
    if (!from && to) {
      queryObject.match = {date: {$lte: to}}
    }
    if (from && to) {
      queryObject.match = {date: {$gte: from, $lte: to}}
    }
    if (limit) {
      queryObject.options = {limit: Number(limit)}
    }
    /*const userExercises = await User.find({_id})
                                    .populate({
                                      path: 'exercises',
                                      match: { date: { $gte: "2001-10-20" } },
                                      select: 'description date duration'
                                    })*/
    const userExercises = await User.findOne({_id}).populate(queryObject)

    res.status(200).json({...userExercises.toObject(), count: userExercises.exercises.length})
  } catch(err) {
    console.log(err.message)
    res.status(500).json(err.message)
  }
})

const start = async () => {
  try {
    console.log('Start connecting DB...')
    await connectDB(process.env.MONGO_URI)
    console.log('DB connected')
    const listener = app.listen(process.env.PORT || 3000, () => { //
      // console.log(listener) // listener.address()
      console.log('Your app is listening on port ' + listener.address().port)
    })
  } catch(err) {
    console.log(err)
  }
}

start()


