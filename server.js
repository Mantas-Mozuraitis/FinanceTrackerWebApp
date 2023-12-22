import express from "express"
import pg from "pg"
import bodyParser from "body-parser"

const app = express();
const port = 3000;

// Location of static files
app.use(express.static("public"));

// PostgreSQL databse config
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "finance_tracker",
    password: "password",
    port: 5432,
})
db.connect();

// body-parser declaration
app.use(bodyParser.urlencoded({ extended: false }));

// Default route request
app.get("/", async (req,res)=>{
    const transactions = await getTransactions();
    res.render("index.ejs", transactions!=null?{transactions:transactions}:{});
})

// New-transaction post request 
app.post("/new-transaction", async (req,res)=>{
    try {
        const transaction = await db.query("INSERT INTO transactions (name, category, amount, date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)", [req.body.name, req.body.category, req.body.amount]);
        res.redirect("/");
    } catch (error) {
        console.error("Error: ", error.message);
    }
})

app.listen(port, (req,res)=>{
    console.log(`Server is listening on port: ${port}`);
}) 

async function getTransactions (){
    try {
        const transactions = await db.query("SELECT * FROM transactions ORDER BY date DESC");
        return transactions.rows.length>0?transactions.rows:null;
    } catch (error) {
        console.error("Error: ", error.message);
    }
}