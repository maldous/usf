package org.usf.validation;

import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.channels.OverlappingFileLockException;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public final class RunLock implements AutoCloseable {
    private final FileChannel channel;
    private final FileLock lock;

    private RunLock(FileChannel channel, FileLock lock) {
        this.channel = channel;
        this.lock = lock;
    }

    public static RunLock acquire(Path repositoryRoot) throws IOException {
        Path lockPath = Path.of(System.getProperty("java.io.tmpdir"))
                .resolve("usf-local-semantic-validation-"
                        + Digests.sha256(repositoryRoot.toRealPath().toString()).substring(0, 20) + ".lock");
        FileChannel channel = FileChannel.open(lockPath, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
        try {
            FileLock lock = channel.tryLock();
            if (lock == null) {
                channel.close();
                throw new IllegalStateException("A conflicting local semantic-validation run is active");
            }
            return new RunLock(channel, lock);
        } catch (OverlappingFileLockException exception) {
            channel.close();
            throw new IllegalStateException("A conflicting local semantic-validation run is active", exception);
        } catch (RuntimeException | IOException exception) {
            channel.close();
            throw exception;
        }
    }

    @Override
    public void close() throws IOException {
        try {
            lock.release();
        } finally {
            channel.close();
        }
    }
}
