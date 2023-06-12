const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', async function() {

  function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  } 
  
  this.timeout(5000);
  // #1   
  test('Creating a new thread: POST request to /api/threads/{board}}', function(done) {
    chai
      .request(server)
      // .keepOpen()
      .post('/api/threads/test/')
      .send({
        text: 'test_Text123',
        delete_password: '123',
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        // done();
      });
    chai
      .request(server)
      // .keepOpen()
      .post('/api/threads/test/')
      .send({
        text: 'test_Text123b',
        delete_password: '123',
      })
      .end(function(err, res) {
        done();
      });
    
  })
  // #2
  let _id = "";
  let _id2 = "";
  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
    chai
      .request(server)
      // .keepOpen()
      .get('/api/threads/test/')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        _id = res.body[0]._id
        _id2 = res.body[1]._id
        assert.equal(res.body[0].text, 'test_Text123b', "Incorrect text");
        assert.equal(res.body.length <= 10, true, "Cannot be more than 10 items");
        assert.equal(res.body[0].replies.length <= 3, true, "Cannot be more than 3 replies");
        done();
      });
  })
  // #3
  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function(done) {
    chai
      .request(server)
      // .keepOpen()
      .delete('/api/threads/test/')
      .send({
        thread_id: _id,
        delete_password: '123abcd',
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password', "Shoud return incorrect password");
        done();
      });
  })
  // #4
  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function(done) {
    chai
      .request(server)
      // .keepOpen()
      .delete('/api/threads/test/')
      .send({
        thread_id: _id,
        delete_password: '123',
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success', "Should return success");
        done();
      });
  })
  // #5
  test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
    chai
      .request(server)
      .post('/api/threads/test/')
      .send({
        text: 'test_Text123a',
        delete_password: '123a',
      })
      .end(function(err, res) {
        // done();
      });
    
    chai
      .request(server)
      // .keepOpen()
      .get('/api/threads/test/')
      .end(function(err, res) {
        let thread =  res.body[0]
        _id =  thread._id
        // done();
      });  
    chai
      .request(server)
      .put('/api/threads/test/')
      .send({
        thread_id: _id,
      })
      .end(function(err, res) {
        assert.equal(res.text, 'reported', "Should return reported");
        done();
      });
  })
  // #6 
   test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
    chai
      .request(server)
      // .keepOpen()
      .post('/api/replies/test')
      .send({        
        text: 'replies_text123a',
        delete_password: '123',
        thread_id : _id2
      })
      .end(async function(err, res) {
        assert.equal(res.status, 200);
        await delay(1000);
        done();
      });
  })
  // #7
  let _id3 = ""
  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
    // await delay(1000);
    chai
      .request(server)
      // .keepOpen()
      .get(`/api/replies/test?thread_id=${_id2}`)
      .end(function(err, res) {
        assert.equal(res.status, 200);
        // console.log(res.body.replies)
        let reply = res.body.replies.slice(-1)[0] // last one is newest
        // console.log(_id2)
        // console.log(reply)
        
        _id3 = reply._id
        assert.equal(reply.text, 'replies_text123a', "Incorrect text of reply");
        done();
      });
  })
  // #8
  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function(done) {
    chai
      .request(server)
      // .keepOpen()
      .delete(`/api/replies/test?thread_id=${_id2}`)
      .send({
        reply_id : _id3,
        delete_password : "abc"
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password', "Should return incorrect password");
        done();
      });
  })
  // #9
  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function(done) {
    chai
      .request(server)
      // .keepOpen()
      .delete(`/api/replies/test?thread_id=${_id2}`)
      .send({
        reply_id : _id3,
        delete_password : "123"
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success', "Should return success");
        done();
      });
  })
  // #10
  test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
    chai
      .request(server)
      .put(`/api/replies/test?thread_id=${_id2}`)
      .send({
        reply_id : _id3,
        thread_id: _id2,
      })
      .end(function(err, res) {
        assert.equal(res.text, 'reported', "Should return reported");
        done();
      });
  })

  
});
