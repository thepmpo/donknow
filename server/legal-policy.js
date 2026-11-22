import {fail} from './secrets.js';
export const legalIdentity={serviceName:'덕',englishName:'Duck',operatorName:'Kim Sanghyun',contactEmail:'thepmpo.official@gmail.com'};
export const legalVersion='2026-11-22';
export const legalDocuments={terms:{version:legalVersion,title:'서비스 이용약관',url:'/terms'},privacy:{version:legalVersion,title:'개인정보 처리방침·수집 및 이용 안내',url:'/privacy'},ai:{version:legalVersion,title:'AI·외부 서비스 이용 안내',url:'/ai-policy'},cookies:{version:legalVersion,title:'쿠키·기기 저장 안내',url:'/cookies'}};
for(const [key,doc] of Object.entries(legalDocuments))doc.archiveUrl='/legal/'+legalVersion+'/'+(key==='ai'?'ai-policy':key);
export const publicLegal=()=>({serviceName:legalIdentity.serviceName,minimumAge:14,documents:legalDocuments,marketingRequired:false});
export function validateSignupAgreements(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.termsVersion!==legalVersion||value.privacyVersion!==legalVersion||value.age14!==true)throw Object.assign(fail(400,'최신 이용약관·개인정보 수집 및 이용에 동의하고 만 14세 이상임을 확인해주세요. 이전 앱에서는 덕 웹에서 가입한 뒤 앱에서 로그인할 수 있어요.'),{code:'SIGNUP_AGREEMENTS_REQUIRED'});
 return {termsVersion:legalVersion,privacyVersion:legalVersion,age14:true};
}
export function signupAgreementsStore(db){db.exec(`CREATE TABLE IF NOT EXISTS signup_agreements(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,terms_version TEXT NOT NULL,privacy_version TEXT NOT NULL,age14 INTEGER NOT NULL,accepted_at TEXT NOT NULL,client TEXT NOT NULL);`);return {
 signupAgreements(user){const row=db.prepare('SELECT terms_version AS termsVersion,privacy_version AS privacyVersion,age14,accepted_at AS acceptedAt,client FROM signup_agreements WHERE user_id=?').get(user);return row?{...row,age14:!!row.age14}:null;}
 };}
