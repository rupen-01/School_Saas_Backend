import {GoogleGenerativeAI} from "@google/generative-ai"

const googleGenerativeAI = new GoogleGenerativeAI("AIzaSyANgvtysqxQcL5SbCixSN4lHDls0ifDPkg")

const gen = async(prompt)=>{
const model = googleGenerativeAI.getGenerativeModel({model: "gemini-2.0-flash"});
const o = await model.generateContent(prompt)
console.log(o.response.text()); }

export {gen}