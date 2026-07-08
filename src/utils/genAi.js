import {GoogleGenerativeAI} from "@google/generative-ai"

const googleGenerativeAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const gen = async(prompt)=>{
    try {
        const model = googleGenerativeAI.getGenerativeModel({model: "gemini-2.0-flash"});
        const o = await model.generateContent(prompt)
        console.log("AI Solution:", o.response.text());
    } catch (error) {
        console.error("GenAI Error (Quota likely exceeded):", error.message);
    }
}

export {gen}