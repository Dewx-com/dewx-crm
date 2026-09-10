const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { clients, gql, owner } = require('./verify-staging-accounts.cjs');

(async () => {
  try {
    const a = await owner('a');
    const b = await owner('b');
    const run = randomUUID();
    const members = await gql(
      a.client,
      'query($email: String!) { workspaceMembers(filter: { userEmail: { eq: $email } }) { edges { node { id } } } }',
      { email: a.fixture.email },
      a.auth,
      '/graphql',
    );
    const assignee = members.data.workspaceMembers.edges[0]?.node.id;
    assert.ok(assignee);
    const company = await gql(
      a.client,
      'mutation($name: String!) { createCompany(data: { name: $name }) { id } }',
      { name: `Synthetic company ${run}` },
      a.auth,
      '/graphql',
    );
    const companyId = company.data.createCompany.id;
    const person = await gql(
      a.client,
      `mutation($company: UUID!) {
      createPerson(data: { name: { firstName: "Synthetic", lastName: "Buyer" }, companyId: $company }) { id companyId }
    }`,
      { company: companyId },
      a.auth,
      '/graphql',
    );
    const personId = person.data.createPerson.id;
    assert.equal(person.data.createPerson.companyId, companyId);
    const opportunity = await gql(
      a.client,
      `mutation($name: String!, $company: UUID!, $person: UUID!, $owner: UUID!) {
      createOpportunity(data: {
        name: $name, companyId: $company, pointOfContactId: $person, ownerId: $owner,
        stage: NEW, amount: { amountMicros: 100000000, currencyCode: "USD" }
      }) { id }
    }`,
      {
        name: `Synthetic sale ${run}`,
        company: companyId,
        person: personId,
        owner: assignee,
      },
      a.auth,
      '/graphql',
    );
    const opportunityId = opportunity.data.createOpportunity.id;
    const won = await gql(
      a.client,
      `mutation($id: UUID!) {
      updateOpportunity(id: $id, data: { stage: CUSTOMER }) { id stage companyId pointOfContactId ownerId amount { amountMicros currencyCode } }
    }`,
      { id: opportunityId },
      a.auth,
      '/graphql',
    );
    assert.equal(won.data.updateOpportunity.stage, 'CUSTOMER');
    assert.equal(won.data.updateOpportunity.companyId, companyId);
    assert.equal(won.data.updateOpportunity.pointOfContactId, personId);
    assert.equal(won.data.updateOpportunity.ownerId, assignee);
    assert.equal(
      Number(won.data.updateOpportunity.amount.amountMicros),
      100000000,
    );
    assert.equal(won.data.updateOpportunity.amount.currencyCode, 'USD');
    const task = await gql(
      a.client,
      `mutation($title: String!, $assignee: UUID!) {
      createTask(data: { title: $title, assigneeId: $assignee, status: TODO, dueAt: "2026-12-01T09:00:00.000Z" }) { id }
    }`,
      { title: `Synthetic follow-up ${run}`, assignee },
      a.auth,
      '/graphql',
    );
    const taskId = task.data.createTask.id;
    await gql(
      a.client,
      `mutation($task: UUID!, $person: UUID!) {
      createTaskTarget(data: { taskId: $task, targetPersonId: $person }) { id }
    }`,
      { task: taskId, person: personId },
      a.auth,
      '/graphql',
    );
    const completed = await gql(
      a.client,
      `mutation($id: UUID!) {
      updateTask(id: $id, data: { status: DONE }) { id status assigneeId dueAt }
    }`,
      { id: taskId },
      a.auth,
      '/graphql',
    );
    assert.equal(completed.data.updateTask.status, 'DONE');
    assert.equal(completed.data.updateTask.assigneeId, assignee);
    assert.equal(
      new Date(completed.data.updateTask.dueAt).toISOString(),
      '2026-12-01T09:00:00.000Z',
    );

    for (const [plural, id] of [
      ['companies', companyId],
      ['people', personId],
      ['opportunities', opportunityId],
      ['tasks', taskId],
    ]) {
      const query = `query($id: UUID!) { ${plural}(filter: { id: { eq: $id } }) { edges { node { id } } } }`;
      const own = await gql(a.client, query, { id }, a.auth, '/graphql');
      assert.equal(own.data[plural].edges[0]?.node.id, id);
      const foreign = await gql(b.client, query, { id }, b.auth, '/graphql');
      assert.equal(foreign.data[plural].edges.length, 0);
    }
    console.log(
      'PASS core CRM: company/contact relationship, owned opportunity with currency and stage transition, assigned dated task linked to contact and completed',
    );
    console.log(
      'PASS isolation: all four record types readable by their account and hidden from another account',
    );
  } finally {
    await Promise.all(clients.map((client) => client.dispose()));
  }
})().catch((error) => {
  console.error(error.message.split('\n')[0]);
  process.exitCode = 1;
});
