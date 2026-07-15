package org.usf.validation;

public record DerivationStep(String ruleIdentity, String ruleSha256, String inputStateSha256,
                             String outputGraph, long statementCount, String outputSha256,
                             long elapsedMillis) {
    public DeterministicIdentity deterministicIdentity() {
        return new DeterministicIdentity(ruleIdentity, ruleSha256, inputStateSha256,
                outputGraph, statementCount, outputSha256);
    }

    public String nextInputStateSha256() {
        return Digests.sha256(inputStateSha256 + '\0' + ruleIdentity + '\0' + ruleSha256 + '\0'
                + outputGraph + '\0' + statementCount + '\0' + outputSha256);
    }

    public record DeterministicIdentity(String ruleIdentity, String ruleSha256, String inputStateSha256,
                                        String outputGraph, long statementCount, String outputSha256) {
    }
}
