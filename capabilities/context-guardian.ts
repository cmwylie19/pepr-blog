import { Capability, a, V1SecurityContext } from "pepr";
import { sdk } from "pepr";

export const ContextGuardian = new Capability({
  name: "context-guardian",
  description: "Focuses on the role of protecting the security context",
});

const { When } = ContextGuardian;
const { containers } = sdk;

When(a.Pod)
  .IsCreatedOrUpdated()
  .Mutate(request => {
    const pod = request.Raw.spec!;
    const metadata = request.Raw.metadata || {};

    // Ensure the securityContext field is defined
    pod.securityContext = pod.securityContext || {};

    // Set the runAsUser field if it is defined in a label
    const runAsUser = metadata.labels?.["uds/user"];
    if (runAsUser) {
      pod.securityContext.runAsUser = parseInt(runAsUser);
    }

    // Set the runAsGroup field if it is defined in a label
    const runAsGroup = metadata.labels?.["uds/group"];
    if (runAsGroup) {
      pod.securityContext.runAsGroup = parseInt(runAsGroup);
    }

    // Set the fsGroup field if it is defined in a label
    const fsGroup = metadata.labels?.["uds/fsgroup"];
    if (fsGroup) {
      pod.securityContext.fsGroup = parseInt(fsGroup);
    }

    // Set the runAsNonRoot field to true if it is undefined
    if (pod.securityContext.runAsNonRoot === undefined) {
      pod.securityContext.runAsNonRoot = true;
    }

    // Set the runAsUser field to 1000 if it is undefined
    if (pod.securityContext.runAsUser === undefined) {
      pod.securityContext.runAsUser = 1000;
    }

    // Set the runAsGroup field to 1000 if it is undefined
    if (pod.securityContext.runAsGroup === undefined) {
      pod.securityContext.runAsGroup = 1000;
    }

    for (const container of containers(request)) {
      container.securityContext = container.securityContext || {};
      container.securityContext.capabilities =
        container.securityContext.capabilities || {};
      container.securityContext.capabilities.drop = ["ALL"];
      container.securityContext.allowPrivilegeEscalation = false;
      container.securityContext.privileged = false;
    }

    metadata.annotations["admission"] = "mutated-security-context";
  })
  .Validate(request => {
    const podCtx = request.Raw.spec?.securityContext || {};

    const isRoot = (ctx: Partial<V1SecurityContext>) => {
      const isRunAsRoot = ctx.runAsNonRoot === false;
      const isRunAsRootUser = ctx.runAsUser === 0;

      return isRunAsRoot || isRunAsRootUser;
    };

    if (isRoot(podCtx)) {
      return request.Deny(
        "Pod level securityContext does not meet the non-root user requirement.",
      );
    }

    return request.Approve();
  });
