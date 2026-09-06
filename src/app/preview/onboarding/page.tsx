import {notFound} from 'next/navigation';
import ClassSetup from '@/components/ClassSetup';
import BrandMark from '@/components/BrandMark';
import '../../onboarding/onboarding.css';
export default function Page(){
 if(process.env.NODE_ENV!=='development')notFound();
 return <main className="onboarding-shell"><header className="onboarding-header"><span className="onboarding-brand"><BrandMark size={36} alt=""/>study<span>circle</span></span><span>Onboarding preview</span></header><section className="onboarding-card onboarding-class-card"><nav className="onboarding-steps" aria-label="Setup progress"><span>1 · Your profile</span><span aria-current="step">2 · Your classes</span></nav><ClassSetup/></section></main>;
}
