import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";

export async function POST(request:Request){
  const c=await getAlphaAppContext();
  if(c.state!=="ready") return NextResponse.json({error:"Authentication required."},{status:401});
  const form=await request.formData();
  const file=form.get("file");
  const projectId=String(form.get("projectId")??"");
  const folderId=String(form.get("folderId")??"");
  const kind=String(form.get("documentKind")??"general");
  const controlled=String(form.get("controlled")??"false")==="true";
  const revision=String(form.get("revision")??"").trim()||null;
  if(!(file instanceof File)||!projectId||!folderId) return NextResponse.json({error:"File, project, and folder are required."},{status:400});

  const s=await createServerSupabaseClient();
  const objectPath=`${c.organizationId}/${projectId}/${crypto.randomUUID()}-${file.name}`;
  const {error:uploadError}=await s.storage.from("project-documents").upload(objectPath,file,{upsert:false,contentType:file.type||undefined});
  if(uploadError) return NextResponse.json({error:uploadError.message},{status:400});

  const {data,error}=await s.rpc("register_uploaded_document",{
    project_id_input:projectId,folder_id_input:folderId,name_input:file.name,
    document_kind_input:kind,controlled_input:controlled,revision_label_input:revision,
    storage_path_input:objectPath,mime_type_input:file.type||null,file_size_input:file.size
  });
  if(error){await s.storage.from("project-documents").remove([objectPath]);return NextResponse.json({error:error.message},{status:400});}
  return NextResponse.json({ok:true,documentId:data},{status:201});
}
