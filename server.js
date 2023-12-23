import express from "express"
import pg from "pg"
import bodyParser from "body-parser"
import axios from "axios"
import dotenv from "dotenv"

// Express server variables
const app = express();
const port = 3000;

// ENV file
dotenv.config();

// Currency API authentication
const currencyApiKey = process.env.CURRENCY_API_KEY;
const currencyApiUrl = "https://v6.exchangerate-api.com/v6/";

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
    const balance = await getBalance();
    res.render("index.ejs", transactions!=null?{transactions:transactions, balance:balance}:{});
})

// New-transaction post request 
app.post("/new-transaction", async (req,res)=>{
    const amount = req.body.category === "out"? req.body.amount*-1:req.body.amount;
    try {
        await db.query("INSERT INTO transactions (name, category, amount, date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)", [req.body.name, req.body.category, amount]);
        res.redirect("/");
    } catch (error) {
        console.error("Error: ", error.message);
    } 
})

// Delete transaction by id
app.post("/delete/:id", async (req,res)=>{
    await deleteTransaction(req.params.id);
    res.redirect("/");
}) 

// Sort transactions post request
app.post("/", async (req,res)=>{
    const sorted = await sortTransactions(req.body.field, req.body.order);
    const balance = await getBalance();
    res.render("index.ejs", sorted!=null?{transactions:sorted, balance:balance}:{});
})

// API request for currency exchange rate
app.post("/currency-exchange", async (req,res)=>{
    const currency = "GBP";
    await getCurrencyRate(currency, req.body.currency);
    res.redirect("/");
})

app.listen(port, (req,res)=>{
    console.log(`Server is listening on port: ${port}`);
}) 


// FUNCTIONS 
async function getBalance(){
    const transactions = await getTransactions();
    let balance = 0;
    if (transactions != null) {
        for (let index = 0; index < transactions.length; index++) {
            balance += transactions[index].amount;
        }
        return balance;
    }else{
        return null;
    }
}
// DATABASE QUERY FUNCTIONS
async function getTransactions (){
    try {
        const transactions = await db.query("SELECT * FROM transactions ORDER BY date DESC");
        return transactions.rows.length>0?transactions.rows:null;
    } catch (error) {
        console.error("Error: ", error.message);
    }
}

async function sortTransactions(field, order){
    try {
        const transactions = await db.query(`SELECT * FROM transactions ORDER BY ${field} ${order}`);
        return transactions.rows.length>0?transactions.rows:null;
    } catch (error) {
        console.error("Error: ", error.message);    
    }
}

async function deleteTransaction (id){
    try {
        await db.query(`DELETE FROM transactions WHERE id = ${id}`);
        console.log(`Transaction with id = ${id} has been deleted`);
    } catch (error) {
        console.error("Error: ", error.message); 
    }
}

// API QUERY FUNCTIONS

async function getCurrencyRate(currency, convert_to){
    const url = `${currencyApiUrl}${currencyApiKey}/pair/${currency}/${convert_to}`;
    try {
        const response = await axios.get((url));
        console.log("API request was successful");
        return response.data.conversion_rate;
    } catch (error) {
        console.error("Error: ", error.message); 
        return null;
    }
}