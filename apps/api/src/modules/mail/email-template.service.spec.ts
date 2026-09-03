import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService retired system templates', () => {
  it('deactivates and hides the retired shop verification template', async () => {
    const prisma = {
      emailTemplate: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      emailTemplateVersion: {},
      $transaction: jest.fn(),
    };
    const service = new EmailTemplateService(prisma as any, {} as any);
    const defaultKeys = (service as any)
      .getSystemTemplateDefinitions()
      .map((definition: { key: string }) => ({ key: definition.key }));

    prisma.emailTemplate.findMany
      .mockResolvedValueOnce([
        ...defaultKeys,
        { key: 'shop_verification_status' },
      ])
      .mockResolvedValueOnce([]);

    await service.listTemplates();

    expect(prisma.emailTemplate.updateMany).toHaveBeenCalledWith({
      where: {
        key: { in: ['shop_verification_status'] },
        isActive: true,
      },
      data: { isActive: false },
    });
    expect(prisma.emailTemplate.findMany).toHaveBeenLastCalledWith({
      where: { key: { notIn: ['shop_verification_status'] } },
      orderBy: [{ isSystem: 'desc' }, { key: 'asc' }],
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
