import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {Document,NodeIO} from '@gltf-transform/core';

test('visitor conversion preserves each material primitive exactly once', async t => {
 const directory=await mkdtemp(join(tmpdir(),'visitor-conversion-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const doc=new Document(), buffer=doc.createBuffer(), mesh=doc.createMesh();
 for(let i=0;i<2;i++) {
  const positions=doc.createAccessor().setType('VEC3').setArray(new Float32Array([i*2,0,0,i*2+1,0,0,i*2,1,0])).setBuffer(buffer);
  const indices=doc.createAccessor().setType('SCALAR').setArray(new Uint16Array([0,1,2])).setBuffer(buffer);
  mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION',positions).setIndices(indices).setMaterial(doc.createMaterial().setBaseColorFactor([i,1-i,0,1])));
 }
 doc.createScene().addChild(doc.createNode().setMesh(mesh));
 const io=new NodeIO(), source=join(directory,'input.glb'),target=join(directory,'output.glb');
 await io.write(source,doc);
 execFileSync(process.execPath,['scripts/prepare-visitor.mjs','fixture',source,target],{stdio:'pipe'});
 const result=await io.read(target);
 const triangles=result.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+p.getIndices().getCount()/3,0);
 assert.equal(triangles,2);
});
