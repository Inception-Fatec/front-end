/* eslint-disable @typescript-eslint/no-explicit-any */
const mockSql = jest.fn();

// Make sql work as tagged template AND as a fragment builder
const sql: any = (...args: unknown[]) => {
  // If first arg is a TemplateStringsArray (tagged template call)
  if (Array.isArray(args[0]) && 'raw' in (args[0] as any)) {
    return mockSql(...args);
  }
  // Otherwise it's a fragment - return a special object
  return { __fragment: true, args };
};

sql.mockResolvedValueOnce = (val: unknown) => mockSql.mockResolvedValueOnce(val);
sql.mockResolvedValue = (val: unknown) => mockSql.mockResolvedValue(val);
sql.mockReset = () => mockSql.mockReset();
sql.mockImplementation = (fn: unknown) => mockSql.mockImplementation(fn);
sql.unsafe = jest.fn();
sql.__mockSql = mockSql;

export default sql;
