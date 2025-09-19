import { PrismaClient } from '@prisma/client';

// Inisialisasi Prisma Client
const prisma = new PrismaClient();

const rolesMaster = [
  'Owner',
  'Manager',
  'Supervisor',
  'Senior',
  'Cashier',
  'Basic',
];

const permissionCategoriesMaster = [
  'Store',
  'General',
  'Product',
  'Cash Drawer',
  'Sales',
  'Customer',
  'Inventory',
  'Purchasing',
  'Staff',
];

const permissionsMaster = [
  {
    category: 'Store',
    permissions: [
      { name: 'Access All Store', key: 'access_all_store' },
      { name: 'Store Management', key: 'store_management' },
    ],
  },
  {
    category: 'General',
    permissions: [
      { name: 'Dashboard View', key: 'dashboard_view' },
      { name: 'Reports', key: 'reports' },
      { name: 'Accounts', key: 'accounts' },
      {
        name: 'Connected Device Configuration',
        key: 'connected_device_configuration',
      },
      {
        name: 'Payment Method Configuration',
        key: 'payment_method_configuration',
      },
      {
        name: 'General Loyalty Point Configuration',
        key: 'general_loyalty_point_configuration',
      },
      {
        name: 'Tax & Service Charge Configuration',
        key: 'tax_and_service_charge_configuration',
      },
      { name: 'Invoice Templates', key: 'invoice_templates' },
    ],
  },
  {
    category: 'Product',
    permissions: [
      { name: 'Product Category', key: 'product_category' },
      { name: 'Product Management', key: 'product_management' },
    ],
  },
  {
    category: 'Cash Drawer',
    permissions: [
      { name: 'Set Up Cash Drawer', key: 'set_up_cash_drawer' },
      { name: 'Close Cash Register', key: 'close_cash_register' },
      { name: 'Cash In/Out', key: 'cash_in_out' },
    ],
  },
  {
    category: 'Sales',
    permissions: [
      { name: 'Daily Sales', key: 'daily_sales' },
      { name: 'Table Management', key: 'table_management' },
      { name: 'Queue', key: 'queue' },
      { name: 'Self Order', key: 'self_order' },
      { name: 'Check Out Sales', key: 'check_out_sales' },
      { name: 'Edit Invoice', key: 'edit_invoice' },
      { name: 'Cancel Invoice', key: 'cancel_invoice' },
      { name: 'Refund Invoice', key: 'refund_invoice' },
      { name: 'Process Unpaid Invoice', key: 'process_unpaid_invoice' },
      { name: 'Voucher', key: 'voucher' },
      { name: 'Payment Rounding Setting', key: 'payment_rounding_setting' },
    ],
  },
  {
    category: 'Customer',
    permissions: [
      { name: 'Customer Management', key: 'customer_management' },
      { name: 'View Customer Profile', key: 'view_customer_profile' },
      {
        name: 'Management Customer Loyalty Point',
        key: 'management_customer_loyalty_point',
      },
    ],
  },
  {
    category: 'Inventory',
    permissions: [
      { name: 'Supplier Management', key: 'supplier_management' },
      { name: 'View Supplier Details', key: 'view_supplier_details' },
      { name: 'Category Management', key: 'category_management' },
      { name: 'Manage Item', key: 'manage_item' },
      { name: 'Stock Adjustment', key: 'stock_adjustment' },
      { name: 'Manage Brand', key: 'manage_brand' },
      { name: 'Manage Stock Opname', key: 'manage_stock_opname' },
      { name: 'Manage Storage Location', key: 'manage_storage_location' },
    ],
  },
  {
    category: 'Purchasing',
    permissions: [
      { name: 'Manage Purchase Order', key: 'manage_purchase_order' },
    ],
  },
  {
    category: 'Staff',
    permissions: [
      { name: 'Manage Staff Member', key: 'manage_staff_member' },
      { name: 'Manage Staff Attendance', key: 'manage_staff_attendance' },
    ],
  },
];

// role -> permission keys (from your checkbox matrix)
const rolePermissionsMaster: Record<string, string[]> = {
  Owner: permissionsMaster.flatMap((g) => g.permissions.map((p) => p.key)), // all
  Manager: [
    'access_all_store',
    'store_management',
    'dashboard_view',
    'reports',
    'accounts',
    'connected_device_configuration',
    'payment_method_configuration',
    'general_loyalty_point_configuration',
    'tax_and_service_charge_configuration',
    'invoice_templates',
    'product_category',
    'product_management',
    'set_up_cash_drawer',
    'close_cash_register',
    'cash_in_out',
    'daily_sales',
    'table_management',
    'queue',
    'self_order',
    'check_out_sales',
    'edit_invoice',
    'cancel_invoice',
    'refund_invoice',
    'process_unpaid_invoice',
    'voucher',
    'payment_rounding_setting',
    'customer_management',
    'view_customer_profile',
    'management_customer_loyalty_point',
    'supplier_management',
    'view_supplier_details',
    'category_management',
    'manage_item',
    'stock_adjustment',
    'manage_brand',
    'manage_stock_opname',
    'manage_storage_location',
    'manage_purchase_order',
    'manage_staff_member',
    'manage_staff_attendance',
  ],
  Supervisor: [
    'store_management',
    'dashboard_view',
    'reports',
    'invoice_templates',
    'product_category',
    'product_management',
    'set_up_cash_drawer',
    'close_cash_register',
    'cash_in_out',
    'daily_sales',
    'table_management',
    'queue',
    'check_out_sales',
    'edit_invoice',
    'cancel_invoice',
    'refund_invoice',
    'process_unpaid_invoice',
    'voucher',
    'payment_rounding_setting',
    'customer_management',
    'view_customer_profile',
    'management_customer_loyalty_point',
    'supplier_management',
    'view_supplier_details',
    'category_management',
    'manage_item',
    'stock_adjustment',
    'manage_brand',
    'manage_stock_opname',
    'manage_storage_location',
    'manage_purchase_order',
    'manage_staff_member',
    'manage_staff_attendance',
  ],
  Senior: [
    'product_category',
    'product_management',
    'set_up_cash_drawer',
    'close_cash_register',
    'cash_in_out',
    'daily_sales',
    'table_management',
    'queue',
    'check_out_sales',
    'edit_invoice',
    'refund_invoice',
    'process_unpaid_invoice',
    'payment_rounding_setting',
    'customer_management',
    'view_customer_profile',
    'management_customer_loyalty_point',
    'supplier_management',
    'view_supplier_details',
    'category_management',
    'manage_item',
    'stock_adjustment',
    'manage_brand',
    'manage_stock_opname',
    'manage_storage_location',
    'manage_purchase_order',
    'manage_staff_member',
    'manage_staff_attendance',
  ],
  Cashier: [
    'set_up_cash_drawer',
    'close_cash_register',
    'cash_in_out',
    'daily_sales',
    'table_management',
    'queue',
    'check_out_sales',
    'process_unpaid_invoice',
    'voucher',
  ],
  Basic: [],
};

const main = async () => {
  await prisma.$transaction(async (tx) => {
    // seed roles
    await tx.roles.createMany({
      data: rolesMaster.map((name) => ({ name, is_system: true })),
      skipDuplicates: true,
    });

    // seed categories
    await tx.permission_categories.createMany({
      data: permissionCategoriesMaster.map((name) => ({ name })),
      skipDuplicates: true,
    });

    // map category name -> id
    const categoryRows = await tx.permission_categories.findMany({
      where: { name: { in: permissionCategoriesMaster } },
      select: { id: true, name: true },
    });
    const categoryMap = Object.fromEntries(
      categoryRows.map((c) => [c.name, c.id]),
    ) as Record<string, string>;

    // seed permissions
    const permissionsData = permissionsMaster.flatMap((group) =>
      group.permissions.map((p) => ({
        permission_category_id: categoryMap[group.category],
        name: p.name,
        key: p.key,
      })),
    );

    await tx.permissions.createMany({
      data: permissionsData,
      skipDuplicates: true,
    });

    // ---- role_permissions seeding ----

    // fetch ids
    const roleRows = await tx.roles.findMany({
      where: { name: { in: rolesMaster } },
      select: { id: true, name: true },
    });
    const permRows = await tx.permissions.findMany({
      where: {
        key: {
          in: permissionsMaster.flatMap((g) => g.permissions.map((p) => p.key)),
        },
      },
      select: { id: true, key: true },
    });

    const roleIdByName = Object.fromEntries(
      roleRows.map((r) => [r.name, r.id]),
    ) as Record<string, string>;

    const permIdByKey = Object.fromEntries(
      permRows.map((p) => [p.key, p.id]),
    ) as Record<string, string>;

    // build join rows
    const rolePermRows = Object.entries(rolePermissionsMaster).flatMap(
      ([roleName, keys]) =>
        keys.map((k) => ({
          role_id: roleIdByName[roleName],
          permission_id: permIdByKey[k],
        })),
    );

    if (rolePermRows.length) {
      await tx.role_permissions.createMany({
        data: rolePermRows,
        skipDuplicates: true,
      });
    }

    // Clone to store_role_permissions (for every store x every role_permission)
    await tx.$executeRaw`
  INSERT INTO store_role_permissions (store_id, role_id, permission_id)
  SELECT s.id AS store_id, rp.role_id, rp.permission_id
  FROM stores s
  CROSS JOIN role_permissions rp
  ON CONFLICT (store_id, role_id, permission_id) DO NOTHING
`;

    console.log('✅ data seeded');
  });
};

// run
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
