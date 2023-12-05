const express = require('express');
const knex = require('knex');
const cors = require('cors');
const fileUpload = require('express-fileupload')

const app = express();
const db =  knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'postgres',
      database : 'showcase'
    }
})

app.use(express.json());
app.use(express.urlencoded({ extended: false}))
app.use(cors());
app.use(fileUpload());

app.get('/', (req,res)=>{
    res.send('hello World');
    db.select().from('user_profiles').then(data=>console.log(data));
});

app.post('/signin', (req, res) =>{
    db.select('email', 'password').from('secrets')
    .where('email', '=', req.body.email)
    .then(data =>{
       if(req.body.password === data[0].password){
        return db.select('*').from('users')
        .where('email', '=', req.body.email)
        .then(user => {
            res.json(user[0])
        })
        .catch(err => res.status(400).json('Unable to get user'));
       } else{
        res.status(400).json('Wrong credentials');
       }
    })
    .catch(err => res.status(400).json('Wrong credentials'));
})

app.post('/register', (req, res)=> {
    const { email, name, password,}  = req.body;

    db.transaction(trx => {
        trx.insert({
            password:password,
            email: email
        })
        .into('secrets')
        .returning('email')
        .then((loginEmail) => {
            return trx('users')
            .returning('*')
            .insert({
                email: loginEmail[0].email,
                name: name,
                date: new Date
            })
            .then(user => {
                res.json(user[0]);
            })
            .then(trx.commit)
            .catch(trx.rollback)

        })
    })

    .catch(err => res.status(400).json('Unable to register'));
});

app.get('/profile/:id', (req,res)=>{
    const { id } = req.params;
    db.select().from('user_profiles').where({id})
        .then(user =>{
        if (user.length){
            res.json(user[0])
        } else{
            res.status(400).json('User not Found')
        }
    })
    .catch(err=> res.status(400).json('Error getting user'))
})



app.post('/upload', async (req, res)=>{
    const { id } = req.params;
    const { title , description, image, link } = req.body;
    const { name, data } = req.files.images;
    if (name && data) {
        await db.insert({imgname:name, image:data}).into('works');
        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }

    
})

// This is a temporary test route
app.get('/images/:id', async (req, res)=>{
    const id = req.params.id;
    const img = (await db.table('works').where({id:id}).first());
    if (img) {
        res.end(img.image)
    } else {
            res.end('no image here')
    }
});

app.listen(3000,()=>{
    console.log('online');
})