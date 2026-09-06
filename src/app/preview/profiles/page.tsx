import { notFound } from 'next/navigation';
import ProfileConcepts from './ProfileConcepts';
export default function Page() {
 if(process.env.NODE_ENV !== 'development') notFound();
 return <ProfileConcepts/>;
}
