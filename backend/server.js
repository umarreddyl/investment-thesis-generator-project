const express=require("express");
const multer=require("multer");
const cors=require("cors");
const {exec}=require("child_process");

const app=express();
app.use(cors());

/* ---------- FILE STORAGE ---------- */
const storage=multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,"uploads/");
  },
  filename:(req,file,cb)=>{
    cb(null,Date.now()+"-"+file.originalname);
  }
});

const upload=multer({storage});

/* ---------- PYTHON EXTRACT ---------- */
function extractFromPython(filePath){
  return new Promise((resolve,reject)=>{
    exec(`python ../processor/extract.py "${filePath}"`,(err,stdout,stderr)=>{
      if(err){
        console.log(err);
        reject(err);
      }else{
        try{
          const data=JSON.parse(stdout);
          resolve(data);
        }catch(e){
          console.log("JSON ERROR:",stdout);
          reject("json error");
        }
      }
    });
  });
}

/* ---------- MAIN REPORT LOGIC ---------- */
function generateReport(textArr){
  const content=textArr.join(" ").toLowerCase();

  let summary=textArr[0] || "No summary available";

  let problem="Not clearly identified";
  if(content.includes("problem")||content.includes("issue")){
    problem="Problem discussed in the presentation";
  }

  let solution="Not clearly defined";
  if(content.includes("solution")||content.includes("propose")){
    solution="Solution approach is mentioned";
  }

  let market="No market data";
  if(content.includes("market")||content.includes("user")){
    market="Potential target users or market mentioned";
  }

  let risks="Not specified";
  if(content.includes("risk")||content.includes("challenge")){
    risks="Some risks or challenges are discussed";
  }

  let recommendation="Needs more validation";
  if(textArr.length>5){
    recommendation="Sufficient content, can be improved and validated";
  }

  return {
    summary,
    problem,
    solution,
    market,
    risks,
    recommendation
  };
}

/* ---------- API ---------- */
app.post("/upload",upload.single("file"),async(req,res)=>{
  try{
    if(!req.file){
      return res.status(400).json({message:"no file"});
    }

    if(!req.file.originalname.endsWith(".pptx")){
      return res.status(400).json({message:"only pptx allowed"});
    }

    const filePath=req.file.path;

    const text=await extractFromPython(filePath);

    // 🔥 USE THIS (IMPORTANT)
    const report=generateReport(text);

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

/* ---------- TEST ROUTE ---------- */
app.get("/",(req,res)=>{
  res.send("backend working");
});

/* ---------- SERVER ---------- */
app.listen(3000,()=>{
  console.log("server running http://localhost:3000");
});