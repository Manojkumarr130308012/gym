const express = require("express");
require("dotenv").config();
const port = 8000 || process.env.PORT;
const cors = require("cors");
const app = express();
const proxy = require("express-http-proxy");
const paths = require("./config");
const fs = require('fs');
const axios = require('axios');
const { config } = require("dotenv");
const admin = require('firebase-admin');
var serviceAccount = require("./admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://letschat-f9f77.firebaseio.com",
});

var storage = admin.storage();

const bucket = storage.bucket('gs://letschat-f9f77.appspot.com');




let jsonData;
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false }));

paths.forEach((element) => {
  app.use(`/api/${element.service}`, proxy(`${element.host}`));
});



const middleware=require('./middleware/middleware');
const { Console } = require("console");
app.use(middleware);


app.get("/get",async(req,res) => {
  res.json({state:"sucesss"})
});

app.post("/producth", async (req, res) => {
  const filePath = "./app_settings.json";

  fs.readFile(filePath, "utf-8", async (err, data) => {
    if (err) {
      console.error("Error reading the file:", err);
    }
    if (req.body != null) {
      let body = req.body;
      let merchant_name = req.body.merchant_name;
      let business_name = req.body.business_name;
      let bodylen = Object.keys(req.body).length;
      removeValues(body,[merchant_name,business_name])
      let filtered = JSON.parse(data)[business_name].filter(item => item[merchant_name])[0];
      let fieldFilter = filtered[merchant_name].filter(data => data.fields.length === Object.keys(body).length)
      let requiredFieldFilter = fieldFilter[0]?.fields?.filter(f => f.req === true && (body[f.field] == null || body[f.field] == ""));
      let requiredService = fieldFilter[0]?.service;
    
      if(requiredFieldFilter?.length == 0){

        console.log(paths.find(ser => ser.service == requiredService))

       let serviceUrl = paths.find(ser => ser.service == requiredService);

       console.log(req.body)

       const headers = {
        'Content-Type': 'application/json',
        // Add other headers if needed
      };

      if(serviceUrl.service == requiredService){
        axios.post(serviceUrl.host,req.body,{headers})
        .then(response => {
          // Handle the response from the API
          res.json({data: response.data })
        })
        .catch(error => {
          // Handle errors
          res.json({state:"Failure",data:  error.message})
        });
      }
      }else{
        res.json({state:"Failure",data: requiredFieldFilter})
      }
     }
  });

});



app.post("/producth/write1", async (req, res) => {
  const file = bucket.file('app_settings.json');

  file.download()
    .then((data) => {
      let combinedJson;
      if(data.toString()){
        const jsonContent = JSON.parse(data[0].toString());
        if(!jsonContent){
          console.log("null",jsonContent);
          combinedJson = req.body;
        }else{
           combinedJson = {...jsonContent,...req.body};
        }
        console.log('JSON Content:', combinedJson);
  
        const jsonString = JSON.stringify(combinedJson, null, 2); // The '2' argument adds indentation for better readability
  
        file.save(jsonString)
        .then(() => {
           res.send("JSON file saved to Firebase Storage.")
        })
        .catch((error) => {
          res.send(error)
        });
      }else{
        combinedJson = req.body;

        console.log("combinedJson",combinedJson)
        file.save(JSON.stringify(combinedJson))
        .then(() => {
           res.send("JSON file saved to Firebase Storage.")
        })
        .catch((error) => {
          console.log("error",error)

          res.send(error)
        });
      }

    })
    .catch((error) => {
      res.send(error)
    });

});


app.post("/producth/read1", async (req, res) => {
  const file = bucket.file('app_settings.json');

  file.download()
    .then((data) => {
      console.log(data)

      const jsonContent = JSON.parse(data[0].toString());
      console.log(jsonContent)
      res.send( jsonContent)
    })
    .catch((error) => {
      res.send(error);
        });

});



app.post("/producth/write", async (req, res) => {
  const filePath = "./app_settings.json";

  fs.readFile(filePath, "utf-8", async (err, data) => {
    if (err) {
      console.error("Error reading the file:", err);
    } 

    let combinedJson;
    console.log("null",data);

    if(!data){
      console.log("null",data);
      combinedJson = req.body;
    }else{
       combinedJson = {...JSON.parse(data),...req.body};
    }
  
   console.log("combinedJson",combinedJson);

  const jsonString = JSON.stringify(combinedJson, null, 2); // The '2' argument adds indentation for better readability

  
  fs.writeFile(filePath, jsonString, async (err, data) => {
    if (err) {
      console.error("Error reading the file:", err);
    }
   else{
    console.log('JSON data written to file successfully.');
   }
  });

});

});


app.post("/producth/read", async (req, res) => {
  const filePath = "./app_settings.json";

  fs.readFile(filePath, "utf-8", async (err, data) => {
    if (err) {
      console.error("Error reading the file:", err);
    } else{
      console.error("success", data);

    }
   });

});


function removeValues(obj, valuesToRemove) {
  // Recursively remove values from the object
  const removeFields = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        removeFields(obj[key]);
      } else if (valuesToRemove.includes(obj[key])) {
        delete obj[key];
      }
    }
  };

 removeFields(obj);
}


app.listen(port, () => console.log(`App listening on port ${port}!`));
