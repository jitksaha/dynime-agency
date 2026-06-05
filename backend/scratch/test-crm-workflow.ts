import { PrismaClient } from '@prisma/client';

async function testWorkflow() {
  console.log('--- Testing CRM Workflow Backend Methods ---');
  const prisma = new PrismaClient();

  try {
    // 1. Get or create a workflow to test
    let workflow = await prisma.crm_workflows.findFirst({
      include: { crm_workflow_steps: true }
    });

    if (!workflow) {
      console.log('No existing workflow found. Creating a test workflow...');
      workflow = await prisma.crm_workflows.create({
        data: {
          name: 'Test Workflow',
          trigger_type: 'lead_created',
          trigger_config: {},
          is_active: false,
          created_by: 'test-admin',
        },
        include: { crm_workflow_steps: true }
      });
    }

    console.log('Test Workflow Loaded:', {
      id: workflow.id,
      name: workflow.name,
      trigger_type: workflow.trigger_type,
      steps_count: workflow.crm_workflow_steps.length,
    });

    // 2. Simulate transaction-based updates
    console.log('\n--- Simulating updateWorkflow with 2 steps ---');
    const stepsPayload = [
      {
        step_type: 'send_email',
        config: { subject: 'Welcome!', template_id: 'temp-123' },
      },
      {
        step_type: 'create_task',
        config: { subject: 'Follow up call', priority: 'high' },
      }
    ];

    // Delete existing steps and insert new ones inside a transaction
    // Replicates our updateWorkflow method
    const id = workflow.id;
    const wfData = {
      name: 'Test Workflow Updated',
      description: 'Updated description from scratch script',
      is_active: true,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const updatedWf = await tx.crm_workflows.update({
        where: { id },
        data: wfData,
      });

      await tx.crm_workflow_steps.deleteMany({
        where: { workflow_id: id },
      });

      if (stepsPayload.length > 0) {
        const payload = stepsPayload.map((s, i) => ({
          workflow_id: id,
          position: i,
          step_type: s.step_type,
          config: s.config || {},
        }));
        await tx.crm_workflow_steps.createMany({
          data: payload,
        });
      }
      return updatedWf;
    });

    console.log('Workflow header updated successfully:', {
      id: updated.id,
      name: updated.name,
      is_active: updated.is_active,
    });

    // 3. Retrieve workflow and verify steps
    const verified = await prisma.crm_workflows.findUnique({
      where: { id },
      include: { crm_workflow_steps: { orderBy: { position: 'asc' } } },
    });

    console.log('\nVerified steps in DB:', verified?.crm_workflow_steps.map(s => ({
      position: s.position,
      step_type: s.step_type,
      config: s.config,
    })));

    if (verified?.crm_workflow_steps.length === 2) {
      console.log('\nSUCCESS! Transactional step updates completed perfectly.');
    } else {
      console.error('\nError: Steps count mismatch.');
    }

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkflow();
