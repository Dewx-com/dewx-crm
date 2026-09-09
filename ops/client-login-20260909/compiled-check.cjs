const assert = require('node:assert/strict');
const {UserResolver} = require('/app/packages/twenty-server/dist/engine/core-modules/user/user.resolver.js');
const {UserService} = require('/app/packages/twenty-server/dist/engine/core-modules/user/services/user.service.js');
(async () => {
 const workspace={id:'workspace',activationStatus:'ACTIVE'};
 const valid={id:'member',userId:'user'}, orphan={id:'orphan',userId:'missing'};
 const membership={id:'membership',userId:'user'},roles=[{id:'role'}];
 let members=[valid,orphan], roleMap=new Map([['membership',roles]]), received;
 const r=Object.assign(Object.create(UserResolver.prototype),{
  userService:{loadWorkspaceMembers:async(...args)=>{received=args;return members;},loadDeletedWorkspaceMembersOnly:async(...args)=>{received=args;return[];}},
  userWorkspaceRepository:{find:async()=>[membership]},userRoleService:{getRolesByUserWorkspaces:async()=>roleMap},
  workspaceMemberTranspiler:{toWorkspaceMemberDtos:x=>x,toDeletedWorkspaceMemberDtos:x=>x}
 });
 assert.deepEqual(await r.workspaceMembers({},workspace),[{userWorkspace:membership,userWorkspaceRoles:roles,workspaceMemberEntity:valid}]);
 assert.deepEqual(received,[workspace,false,true]);
 for(const missing of [undefined,[]]){roleMap=new Map([['membership',missing]]);assert.deepEqual(await r.workspaceMembers({},workspace),[]);}
 members=[];assert.deepEqual(await r.workspaceMembers({},workspace),[]);
 assert.deepEqual(await r.workspaceMembers({},undefined),[]);
 assert.deepEqual(await r.deletedWorkspaceMembers({},workspace),[]);assert.deepEqual(received,[workspace,true]);
 for(const method of ['loadWorkspaceMembers','loadDeletedWorkspaceMembersOnly']){
  let options,auth;
  const service=Object.assign(Object.create(UserService.prototype),{
   refreshWorkspaceIfPendingOrOngoingCreation:async()=>workspace,
   globalWorkspaceOrmManager:{getRepository:async(_id,_name,opts)=>{options=opts;return{find:async()=>[]};},executeInWorkspaceContext:async(fn,ctx)=>{auth=ctx;return fn();}}
  });
  if(method==='loadWorkspaceMembers')await service[method](workspace,false,true);else await service[method](workspace,true);
  assert.equal(options,undefined);assert.equal(auth,undefined);
  if(method==='loadWorkspaceMembers')await service[method](workspace);else await service[method](workspace);
  assert.equal(options.shouldBypassPermissionChecks,true);assert.equal(auth.type,'system');
 }
 console.log('PASS: compiled resolver skips stale members; active/deleted lists respect request permissions; internal system callers retained.');
})().catch(e=>{console.error(e);process.exit(1);});
