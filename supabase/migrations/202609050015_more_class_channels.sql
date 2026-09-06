begin;
alter table public.study_messages drop constraint study_messages_channel_check;
alter table public.study_messages add constraint study_messages_channel_check
 check(channel in ('general','homework','meetups','ai','exam-prep','projects','resources','off-topic'));
commit;
