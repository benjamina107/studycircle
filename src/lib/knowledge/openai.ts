import OpenAI from 'openai';
export function aiClient() {
 if(!process.env.OPENAI_API_KEY) throw new Error('AI configuration missing');
 return new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:180_000,maxRetries:2});
}
export const responseModel = () => process.env.OPENAI_RESPONSE_MODEL || 'gpt-5.4-mini';
export async function embed(text: string[]) {
 const result=await aiClient().embeddings.create({model:'text-embedding-3-small',dimensions:1536,input:text});
 return result.data.sort((a,b)=>a.index-b.index).map(item=>item.embedding);
}
export const extractionSchema = {
 type:'object',additionalProperties:false,required:['text'],properties:{text:{type:'string'}},
};
export const answerSchema = {
 type:'object',additionalProperties:false,required:['body','cards','sourceIds'],properties:{
  body:{type:'string'}, sourceIds:{type:'array',items:{type:'string'}},
  cards:{type:'array',items:{type:'object',additionalProperties:false,required:['question','answer'],properties:{question:{type:'string'},answer:{type:'string'}}}},
 },
};
