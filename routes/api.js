'use strict';
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
module.exports = async function(app) {

  // ----- mongoDB related -----
  mongoose.connect(process.env.DB);
  const replySchema = new mongoose.Schema({
    text: String,
    created_on: { type: Date, default: Date.now },
    delete_password: String,
    thread_id: String,
    reported: Boolean,
  });
  const threadSchema = new mongoose.Schema({
    board: { type: String, required: true },
    text: String,
    created_on: { type: Date, default: Date.now },
    bumped_on: { type: Date, default: Date.now },
    reported: Boolean,
    delete_password: String,
    replies: [replySchema],
    replycount: { type: Number, default: 0 }
  });

  const Replies = mongoose.model('Replies', replySchema)
  const Threads = mongoose.model('Threads', threadSchema)
  // ----- mongoDB related -----
  const saltRounds = 2 //bcrypt

  app.route('/api/threads/:board')
    .post(async (req, res) => {
      console.log("POST threads")
      // console.log(`board : ${req.params.board}`)
      // console.log(req.body)

      const board = req.body.board || req.params.board
      const text = req.body.text
      const delete_pw = req.body.delete_password
      const hash_pw = await bcrypt.hashSync(delete_pw, saltRounds)

      if (!board) return res.json({ error: "No board" })

      // create new thread and save to mongoDB
      const newThread = new Threads({
        board: board,
        text: text,
        delete_password: hash_pw,
        replies: [],
        reported: false,
      });

      let response = await newThread.save()
      // return res.json(response)
      return res.redirect(`/b/${board}/`);

    })
    // ----------------------------------------------
    .get(async (req, res) => {
      console.log("GET threads")
      // console.log(req.params) // good
      // console.log(req.body)
      const board = req.params.board
      // const board = req.params.board || req.body.board
      let queryThreadArr = await Threads
        .find({ board: board })
        .sort({ bumped_on: -1 })
        .limit(10)
        .select({ reported: 0, delete_password: 0, __v: 0, board: 0 })
        .exec()

      // for Each arrayitem in queryThread, replace the replies Array with 3 most recentfrom mongoDB   
      // Promises in forEach() vs map() is different
      const promises = queryThreadArr.map(async (thread) => {
        const response = await Replies
          .find({ thread_id: thread['_id'] })
          .sort({ created_on: 1 })
          // .limit(-3) negative wont work
          .select({ reported: 0, delete_password: 0, __v: 0, thread_id: 0 })
          .exec()
        
        if (response) {
          thread.replies = response.slice(-3,) // After sorted in ascending order, get the last 3
          // console.log(thread)
          thread.replycount = response.length
          return thread;
        }
      });
      /*
      // https://zellwk.com/blog/async-await-in-loops/
      const repliedThreadArr = await Promise.all(promises)
      
      // console.log("returning")
      console.log(repliedThreadArr)
      return res.json(repliedThreadArr)     
      */
      Promise.all(promises).then(results => {
        // console.log(results);
        return res.json(results)
      })

    })
    // ----------------------------------------------
    .delete(async (req, res) => {
      console.log("DELETE threads")
      // console.log(req.body)
      const thread_id = req.body.thread_id
      const delete_password = req.body.delete_password
      let response = await Threads.findById(thread_id)
      //  assume found, check if bcrypt password same as mongoDB record, then DELETE
      if (await bcrypt.compareSync(delete_password, response.delete_password)) {
        // PASSWORD CORRECT. delete from mongoDB
        await Threads.findByIdAndRemove(thread_id)
        return res.send('success')
      } else {
        // PASSWORD INCORRECT
        return res.send('incorrect password')
      }

    })
    // ----------------------------------------------
    .put(async (req, res) => {
      console.log("PUT threads")
      // console.log(req.body)
      const report_id = req.body.report_id
      let response = await Threads.findByIdAndUpdate(report_id, { reported: true })
      return res.send("reported")
    });

  // ----------------------------------------------
  app.route('/api/replies/:board')
    .post(async (req, res) => {
      console.log("POST replies")
      console.log(req.body)
      console.log(req.params)
      // return res.json({error : "error"})
      const board = req.params.board
      // const board = req.params.board || req.body.board
      const thread_id = req.body.thread_id
      const text = req.body.text
      const delete_pw = req.body.delete_password
      const hash_pw = await bcrypt.hashSync(delete_pw, saltRounds)
      // query by_id from mongoDB, assuume found and user enter corrrect board string.
      // create new Reply and save to mongoDB
      // update to Thread and save to mongoDB
      let queryThread = await Threads.findById(thread_id).exec();
      // console.log(queryThread)
      if (!queryThread) return res.json({"error" : "Error could not find Thread by thread_id"})
      const newReply = new Replies({
        text: text,
        delete_password: hash_pw,
        thread_id: thread_id,
        reported: false,
      });
      let response = await newReply.save() // newReply return with_id
      // console.log(response)
      // assume save succesful
      // console.log(response)
      
      queryThread.bumped_on = await response.created_on
      // queryThread.replies.push(response)
      let response2 = await Threads.findByIdAndUpdate(thread_id, {
        bumped_on: queryThread.bumped_on,
        // replycount : queryThread.replycount + 1,
        // replies : queryThread.replies
      })
      // console.log(response2)

      return res.redirect(`/b/${board}/${thread_id}`)
    })
    // ----------------------------------------------
    .get(async (req, res) => {
      console.log("GET replies")
      // console.log(req.query)
      // console.log(req.body)
      const board = req.params.board
      // const board = req.params.board || req.body.board
      const thread_id = req.query.thread_id || req.body.thread_id

      // find by thread_id
      let queryThread = await Threads
        .findOne({ _id: thread_id })
        .select({ delete_password: 0, reported: 0, board: 0, __v: 0, replycount: 0 })
        .exec()
      
      // find replies and update it
      let queryReply = await Replies
        .find({ thread_id: thread_id })
        .select({ delete_password: 0, reported: 0, __v: 0, thread_id: 0 })
        .exec()
      if(!queryThread) return res.json({"error" :"Error , could not find thread by thread_id"})
      if(queryReply){
        queryThread.replies = queryReply
        // console.log(queryThread)
        return res.send(queryThread)
      }
    })
    // ----------------------------------------------
    .delete(async (req, res) => {
      console.log("DELETE replies")
      console.log(req.body)
      
      const reply_id = req.body.reply_id
      const delete_password = req.body.delete_password
      if (!delete_password) return res.send('incorrect password')
      let response = await Replies.findById(reply_id)
      //  assume found, check if bcrypt password same as mongoDB record, then DELETE
      if (!response) return res.send('incorrect password')
      let ifPasswordCorrect = await bcrypt.compareSync(delete_password, response.delete_password)
      if (ifPasswordCorrect) {
        // PASSWORD CORRECT. delete from mongoDB
        let response = await Replies.findByIdAndUpdate(reply_id, { text: '[deleted]' })
        console.log("success")
        return res.send('success')
        // return res.send('success')
      } else {
        // PASSWORD INCORRECT
        console.log("incorrect password")
        return res.send('incorrect password')
      }

    })
    // ----------------------------------------------
    .put(async (req, res) => {
      console.log("PUT replies")
      // console.log(req.body)
      const reply_id = req.body.reply_id
      let response = await Replies.findByIdAndUpdate(reply_id, { reported: true })
      return res.send("reported")

    });



};
