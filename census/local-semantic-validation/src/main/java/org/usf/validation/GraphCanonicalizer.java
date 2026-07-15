package org.usf.validation;

import java.util.Iterator;

public interface GraphCanonicalizer<T> {
    String algorithm();

    String implementationVersion();

    String blankNodeHandling();

    String graphIdentityHandling();

    String serializationNormalization();

    Digests.GraphDigest digest(Iterator<T> values);
}
