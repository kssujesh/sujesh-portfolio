require("dotenv").config();
const express=require("express"), session=require("express-session"), helmet=require("helmet"), path=require("path"), fs=require("fs"), Database=require("better-sqlite3"), bcrypt=require("bcryptjs");
const app=express();
const PORT=process.env.PORT||3000;
const DATA_DIR=path.join(__dirname,"data"); fs.mkdirSync(DATA_DIR,{recursive:true});
const db=new Database(path.join(DATA_DIR,"portfolio.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS profile(id INTEGER PRIMARY KEY CHECK(id=1), name TEXT, headline TEXT, positioning TEXT, bio TEXT, location TEXT, education TEXT, cgpa TEXT, graduation TEXT, email TEXT, github TEXT, linkedin TEXT, resume TEXT);
CREATE TABLE IF NOT EXISTS stats(id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT, label TEXT);
CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, category TEXT, year TEXT, featured INTEGER DEFAULT 0, description TEXT, result TEXT, tags TEXT, github TEXT, demo TEXT);
CREATE TABLE IF NOT EXISTS experience(id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT, role TEXT, organization TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS education(id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT, title TEXT, organization TEXT, detail TEXT);
CREATE TABLE IF NOT EXISTS skills(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, group_name TEXT, level TEXT);
CREATE TABLE IF NOT EXISTS certifications(id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT);
CREATE TABLE IF NOT EXISTS achievements(id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT);
CREATE TABLE IF NOT EXISTS roadmap(id INTEGER PRIMARY KEY AUTOINCREMENT, phase TEXT, title TEXT, text TEXT);
`);

function seed(){
 if(!db.prepare("SELECT id FROM profile WHERE id=1").get()){
  const d=JSON.parse(fs.readFileSync(path.join(__dirname,"seed.json")));
  db.prepare(`INSERT INTO profile(id,name,headline,positioning,bio,location,education,cgpa,graduation,email,github,linkedin,resume) VALUES(1,@name,@headline,@positioning,@bio,@location,@education,@cgpa,@graduation,@email,@github,@linkedin,@resume)`).run(d.profile);
  const insStat=db.prepare("INSERT INTO stats(value,label) VALUES(?,?)"); d.stats.forEach(x=>insStat.run(x.value,x.label));
  const insP=db.prepare("INSERT INTO projects(title,category,year,featured,description,result,tags,github,demo) VALUES(?,?,?,?,?,?,?,?,?)"); d.projects.forEach(x=>insP.run(x.title,x.category,x.year,x.featured,x.description,x.result,x.tags,x.github,x.demo));
  const insE=db.prepare("INSERT INTO experience(period,role,organization,description) VALUES(?,?,?,?)"); d.experience.forEach(x=>insE.run(x.period,x.role,x.organization,x.description));
  const insEd=db.prepare("INSERT INTO education(period,title,organization,detail) VALUES(?,?,?,?)"); d.education.forEach(x=>insEd.run(x.period,x.title,x.organization,x.detail));
  const insS=db.prepare("INSERT INTO skills(name,group_name,level) VALUES(?,?,?)"); d.skills.forEach(x=>insS.run(x.name,x.group,x.level));
  const insC=db.prepare("INSERT INTO certifications(text) VALUES(?)"); d.certifications.forEach(x=>insC.run(x));
  const insA=db.prepare("INSERT INTO achievements(text) VALUES(?)"); d.achievements.forEach(x=>insA.run(x));
  const insR=db.prepare("INSERT INTO roadmap(phase,title,text) VALUES(?,?,?)"); d.roadmap.forEach(x=>insR.run(x.phase,x.title,x.text));
 }
 const admin=process.env.ADMIN_USERNAME||"sujesh";
 const pass=process.env.ADMIN_PASSWORD||"change-me";
 if(!db.prepare("SELECT id FROM admins WHERE username=?").get(admin)){
  db.prepare("INSERT INTO admins(username,password_hash) VALUES(?,?)").run(admin,bcrypt.hashSync(pass,12));
 }
}
seed();

app.set("view engine","ejs"); app.set("views",path.join(__dirname,"views"));
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.urlencoded({extended:true})); app.use(express.json());
app.use(session({secret:process.env.SESSION_SECRET||"dev-only-change-me",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production"}}));
app.use(express.static(path.join(__dirname,"public")));

function getAll(){
 return {
  profile:db.prepare("SELECT * FROM profile WHERE id=1").get(),
  stats:db.prepare("SELECT * FROM stats ORDER BY id").all(),
  projects:db.prepare("SELECT * FROM projects ORDER BY featured DESC, year DESC, id DESC").all().map(x=>({...x,tags:x.tags?x.tags.split(",").map(s=>s.trim()).filter(Boolean):[]})),
  experience:db.prepare("SELECT * FROM experience ORDER BY id").all(),
  education:db.prepare("SELECT * FROM education ORDER BY id").all(),
  skills:db.prepare("SELECT * FROM skills ORDER BY id").all(),
  certifications:db.prepare("SELECT * FROM certifications ORDER BY id").all(),
  achievements:db.prepare("SELECT * FROM achievements ORDER BY id").all(),
  roadmap:db.prepare("SELECT * FROM roadmap ORDER BY id").all()
 };
}
app.get("/api/portfolio",(req,res)=>res.json(getAll()));
app.get("/",(req,res)=>res.render("home",{d:getAll()}));

function auth(req,res,next){if(req.session.admin)return next();res.redirect("/admin/login")}
app.get("/admin/login",(req,res)=>res.render("login",{error:null}));
app.post("/admin/login",(req,res)=>{
 const u=db.prepare("SELECT * FROM admins WHERE username=?").get(req.body.username);
 if(u && bcrypt.compareSync(req.body.password,u.password_hash)){req.session.admin={id:u.id,username:u.username};return res.redirect("/admin")}
 res.status(401).render("login",{error:"Incorrect username or password."});
});
app.post("/admin/logout",(req,res)=>req.session.destroy(()=>res.redirect("/admin/login")));

app.get("/admin",auth,(req,res)=>res.render("admin",{d:getAll(),user:req.session.admin}));

function redirectAdmin(res){res.redirect("/admin");}
app.post("/admin/profile",auth,(req,res)=>{db.prepare(`UPDATE profile SET name=@name,headline=@headline,positioning=@positioning,bio=@bio,location=@location,education=@education,cgpa=@cgpa,graduation=@graduation,email=@email,github=@github,linkedin=@linkedin,resume=@resume WHERE id=1`).run(req.body);redirectAdmin(res)});
app.post("/admin/projects/save",auth,(req,res)=>{
 const b=req.body; const tags=Array.isArray(b.tags)?b.tags.join(","):b.tags||"";
 if(b.id) db.prepare(`UPDATE projects SET title=?,category=?,year=?,featured=?,description=?,result=?,tags=?,github=?,demo=? WHERE id=?`).run(b.title,b.category,b.year,b.featured?1:0,b.description,b.result,tags,b.github,b.demo,b.id);
 else db.prepare(`INSERT INTO projects(title,category,year,featured,description,result,tags,github,demo) VALUES(?,?,?,?,?,?,?,?,?)`).run(b.title,b.category,b.year,b.featured?1:0,b.description,b.result,tags,b.github,b.demo);
 redirectAdmin(res)
});
app.post("/admin/projects/delete",auth,(req,res)=>{db.prepare("DELETE FROM projects WHERE id=?").run(req.body.id);redirectAdmin(res)});
app.post("/admin/skills/save",auth,(req,res)=>{const b=req.body;if(b.id)db.prepare("UPDATE skills SET name=?,group_name=?,level=? WHERE id=?").run(b.name,b.group_name,b.level,b.id);else db.prepare("INSERT INTO skills(name,group_name,level) VALUES(?,?,?)").run(b.name,b.group_name,b.level);redirectAdmin(res)});
app.post("/admin/skills/delete",auth,(req,res)=>{db.prepare("DELETE FROM skills WHERE id=?").run(req.body.id);redirectAdmin(res)});
app.post("/admin/experience/save",auth,(req,res)=>{const b=req.body;if(b.id)db.prepare("UPDATE experience SET period=?,role=?,organization=?,description=? WHERE id=?").run(b.period,b.role,b.organization,b.description,b.id);else db.prepare("INSERT INTO experience(period,role,organization,description) VALUES(?,?,?,?)").run(b.period,b.role,b.organization,b.description);redirectAdmin(res)});
app.post("/admin/experience/delete",auth,(req,res)=>{db.prepare("DELETE FROM experience WHERE id=?").run(req.body.id);redirectAdmin(res)});
app.post("/admin/certifications/save",auth,(req,res)=>{const b=req.body;if(b.id)db.prepare("UPDATE certifications SET text=? WHERE id=?").run(b.text,b.id);else db.prepare("INSERT INTO certifications(text) VALUES(?)").run(b.text);redirectAdmin(res)});
app.post("/admin/certifications/delete",auth,(req,res)=>{db.prepare("DELETE FROM certifications WHERE id=?").run(req.body.id);redirectAdmin(res)});
app.post("/admin/achievements/save",auth,(req,res)=>{const b=req.body;if(b.id)db.prepare("UPDATE achievements SET text=? WHERE id=?").run(b.text,b.id);else db.prepare("INSERT INTO achievements(text) VALUES(?)").run(b.text);redirectAdmin(res)});
app.post("/admin/achievements/delete",auth,(req,res)=>{db.prepare("DELETE FROM achievements WHERE id=?").run(req.body.id);redirectAdmin(res)});

app.listen(PORT,()=>console.log(`Portfolio running at http://localhost:${PORT}`));
