"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
};
exports.default = config;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamVzdC5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqZXN0LmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLE1BQU0sTUFBTSxHQUFXO0lBQ3JCLGVBQWUsRUFBRSxNQUFNO0lBQ3ZCLEtBQUssRUFBRSxDQUFDLGdCQUFnQixDQUFDO0lBQ3pCLFNBQVMsRUFBRSxDQUFDLGNBQWMsQ0FBQztJQUMzQixTQUFTLEVBQUU7UUFDVCxhQUFhLEVBQUUsU0FBUztLQUN6QjtJQUNELGtCQUFrQixFQUFFLENBQUMsd0NBQXdDLENBQUM7Q0FDL0QsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgQ29uZmlnIH0gZnJvbSAnamVzdCc7XG5cbmNvbnN0IGNvbmZpZzogQ29uZmlnID0ge1xuICB0ZXN0RW52aXJvbm1lbnQ6ICdub2RlJyxcbiAgcm9vdHM6IFsnPHJvb3REaXI+L3Rlc3QnXSxcbiAgdGVzdE1hdGNoOiBbJyoqLyoudGVzdC50cyddLFxuICB0cmFuc2Zvcm06IHtcbiAgICAnXi4rXFxcXC50c3g/JCc6ICd0cy1qZXN0JyxcbiAgfSxcbiAgc2V0dXBGaWxlc0FmdGVyRW52OiBbJ2F3cy1jZGstbGliL3Rlc3RoZWxwZXJzL2plc3QtYXV0b2NsZWFuJ10sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjb25maWc7XG4iXX0=