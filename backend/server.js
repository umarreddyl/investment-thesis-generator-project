const express=require("express");
const multer=require("multer");
const cors=require("cors");
const {exec}=require("child_process");
const {GoogleGenAI}=require("@google/genai");

const app=express();
app.use(cors());

const genAI=new GoogleGenAI({apiKey:"AIzaSyAQMNdSs6_IWui8VCJUCExriP2vwRUZElQ"});

const storage=multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,"uploads/");
  },
  filename:(req,file,cb)=>{
    cb(null,Date.now()+"-"+file.originalname);
  }
});

const upload=multer({storage});

function extractFromPython(filePath){
  return new Promise((resolve,reject)=>{
    exec(`python ../processor/extract.py "${filePath}"`,(err,stdout,stderr)=>{
      if(err){
        reject(err);
      }else{
        try{
          resolve(JSON.parse(stdout));
        }catch(e){
          reject("json error");
        }
      }
    });
  });
}

async function generateReport(text){
  const combined=text.join("\n");

  const response=await genAI.models.generateContent({
    model:"gemini-2.0-flash",
    contents:`Analyze this pitch deck and give:

Summary
Problem
Solution
Market
Risks
Recommendation

Content:
${combined}`
  });

  return response.text;
}

app.post("/upload",upload.single("file"),async(req,res)=>{
  try{
    if(!req.file){
      return res.status(400).json({message:"no file"});
    }

    const filePath=req.file.path;

    const text=await extractFromPython(filePath);

    const report=await generateReport(text);

    console.log(report);

    res.json({
      message:"ok",
      report:report
    });

  }catch(e){
    console.log(e);
    res.status(500).json({message:"fail"});
  }
});

app.listen(3000,()=>{
  console.log("server running http://localhost:3000");
});